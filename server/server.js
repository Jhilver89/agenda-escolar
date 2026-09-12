import 'dotenv/config'

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { Readable } from 'node:stream'
import pdfParse from 'pdf-parse-debugging-disabled'
import { pdf } from 'pdf-to-img'
import { createWorker } from 'tesseract.js'

const app = express()

const PORT = process.env.PORT || 10000

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

const SUPABASE_URL = process.env.SUPABASE_URL

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.'
  )
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

/* =========================
   CORS
========================= */

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (
    origin === FRONTEND_ORIGIN ||
    !origin
  ) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      FRONTEND_ORIGIN
    )
  }

  res.setHeader(
    'Vary',
    'Origin'
  )

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS'
  )

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Range, Content-Type'
  )

  res.setHeader(
    'Access-Control-Expose-Headers',
    [
      'Accept-Ranges',
      'Content-Length',
      'Content-Range',
      'Content-Type',
      'ETag'
    ].join(', ')
  )

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

/* =========================
   JSON
========================= */

app.use(
  express.json({
    limit: '1mb'
  })
)

/* =========================
   HEALTH CHECK
========================= */

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'agenda-ranking-library-proxy'
  })
})

/* =========================
   GOOGLE DRIVE
========================= */

function obtenerDriveFileId(url) {
  if (!url) {
    return null
  }

  const patrones = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&]+)/
  ]

  for (const patron of patrones) {
    const coincidencia = url.match(patron)

    if (coincidencia?.[1]) {
      return coincidencia[1]
    }
  }

  return null
}

function obtenerDriveDownloadUrl(fileId) {
  return (
    `https://drive.google.com/uc?` +
    `export=download&id=${fileId}`
  )
}

/* =========================
   LIMPIAR TEXTO PDF
========================= */

function limpiarTexto(texto) {
  if (!texto) {
    return ''
  }

  return texto
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* =========================
   DETECTAR TÍTULO
========================= */

function detectarTitulo(texto) {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)

  if (!lineas.length) {
    return null
  }

  const palabrasIgnoradas = [
    'índice',
    'indice',
    'contenido',
    'introducción',
    'introduccion',
    'prólogo',
    'prologo',
    'www.',
    'http',
    'isbn'
  ]

  for (const linea of lineas.slice(0, 40)) {
    const minuscula = linea.toLowerCase()

    if (
      linea.length < 3 ||
      linea.length > 150
    ) {
      continue
    }

    if (
      palabrasIgnoradas.some((palabra) =>
        minuscula.includes(palabra)
      )
    ) {
      continue
    }

    if (
      /^[0-9\s.,:;/-]+$/.test(linea)
    ) {
      continue
    }

    return linea
  }

  return null
}

/* =========================
   DETECTAR AUTOR
========================= */

function detectarAutor(texto) {
  const patrones = [
    /(?:autor|autora|escrito por|escritora|escritor)\s*[:\-]?\s*([^\n]{2,100})/i,

    /(?:por)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+){1,5})/i
  ]

  for (const patron of patrones) {
    const coincidencia = texto.match(patron)

    if (coincidencia?.[1]) {
      return coincidencia[1]
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  return null
}

/* =========================
   DETECTAR CATEGORÍA
========================= */

function detectarCategoria(texto) {
  const contenido = texto.toLowerCase()

  if (
    contenido.includes('cuento') ||
    contenido.includes('monstruo') ||
    contenido.includes('aventura') ||
    contenido.includes('personaje')
  ) {
    return 'Cuentos'
  }

  if (
    contenido.includes('planeta') ||
    contenido.includes('naturaleza') ||
    contenido.includes('animales') ||
    contenido.includes('ecosistema') ||
    contenido.includes('ciencia')
  ) {
    return 'Ciencia'
  }

  if (
    contenido.includes('historia') ||
    contenido.includes('civilización') ||
    contenido.includes('civilizacion') ||
    contenido.includes('independencia')
  ) {
    return 'Historia'
  }

  if (
    contenido.includes('literatura') ||
    contenido.includes('poema') ||
    contenido.includes('poesía') ||
    contenido.includes('poesia')
  ) {
    return 'Literatura'
  }

  if (
    contenido.includes('educación') ||
    contenido.includes('educacion') ||
    contenido.includes('aprendizaje')
  ) {
    return 'Educación'
  }

  return 'General'
}

/* =========================
   DETECTAR DESCRIPCIÓN
========================= */

function detectarDescripcion(texto, titulo) {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)

  const candidatos = lineas.filter((linea) => {
    if (linea.length < 60) {
      return false
    }

    if (titulo && linea === titulo) {
      return false
    }

    if (/^(isbn|www\.|http)/i.test(linea)) {
      return false
    }

    return true
  })

  if (!candidatos.length) {
    return null
  }

  return candidatos
    .slice(0, 3)
    .join(' ')
    .slice(0, 700)
    .trim()
}

/* =========================
   OCR PARA PDF ESCANEADO
========================= */

async function extraerTextoConOcr(
  buffer,
  paginasMaximas = 5
) {
  console.log(
    'PDF sin texto. Iniciando OCR...'
  )

  const dataUrl =
    `data:application/pdf;base64,${buffer.toString('base64')}`

  const documento =
    await pdf(
      dataUrl,
      {
        scale: 2,
        format: 'jpg'
      }
    )

  const totalPaginas =
    Math.min(
      documento.length,
      paginasMaximas
    )

  console.log(
    `OCR: procesando ${totalPaginas} de ${documento.length} páginas.`
  )

  const worker =
    await createWorker(
      'spa',
      1,
      {
        logger: (mensaje) => {
          if (
            mensaje?.status ===
            'recognizing text'
          ) {
            const progreso =
              Math.round(
                (mensaje.progress || 0) *
                100
              )

            console.log(
              `OCR progreso: ${progreso}%`
            )
          }
        }
      }
    )

  try {
    const textos = []

    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {
      console.log(
        `OCR: procesando página ${pagina}/${totalPaginas}...`
      )

      const imagen =
        await documento.getPage(
          pagina
        )

      const resultado =
        await worker.recognize(
          imagen
        )

      const textoPagina =
        resultado?.data?.text?.trim() ||
        ''

      if (textoPagina) {
        textos.push(
          textoPagina
        )
      }
    }

    const textoOcr =
      limpiarTexto(
        textos.join('\n\n')
      )

    console.log(
      `OCR terminado. Caracteres extraídos: ${textoOcr.length}`
    )

    return textoOcr

  } finally {
    await worker.terminate()
    await documento.destroy()
  }
}

/* =========================
   ANALIZAR PDF
========================= */

app.post(
  '/api/library/analyze',
  async (req, res) => {
    try {
      const {
        pdf_url
      } = req.body

      if (!pdf_url) {
        return res.status(400).json({
          error:
            'No se recibió el enlace del PDF.'
        })
      }

      const driveFileId =
        obtenerDriveFileId(
          pdf_url
        )

      if (!driveFileId) {
        return res.status(400).json({
          error:
            'La URL de Google Drive no tiene un formato válido.'
        })
      }

      console.log(
        '========================================'
      )

      console.log(
        'ANALIZANDO LIBRO'
      )

      console.log(
        `Google Drive ID: ${driveFileId}`
      )

      const driveUrl =
        obtenerDriveDownloadUrl(
          driveFileId
        )

      const upstream =
        await fetch(
          driveUrl,
          {
            method: 'GET'
          }
        )

      console.log(
        `Google Drive respondió: ${upstream.status}`
      )

      if (!upstream.ok) {
        return res.status(502).json({
          error:
            'Google Drive no pudo entregar el PDF.',
          status:
            upstream.status
        })
      }

      const contentType =
        upstream.headers.get(
          'content-type'
        ) || ''

      console.log(
        `Content-Type: ${contentType}`
      )

      if (
        !contentType.includes(
          'application/pdf'
        ) &&
        !contentType.includes(
          'application/octet-stream'
        )
      ) {
        console.error(
          'Google Drive no devolvió un PDF.'
        )

        return res.status(502).json({
          error:
            'Google Drive no devolvió un archivo PDF.',
          contentType
        })
      }

      if (!upstream.body) {
        return res.status(502).json({
          error:
            'Google Drive no entregó contenido.'
        })
      }

      const arrayBuffer =
        await upstream.arrayBuffer()

      const buffer =
        Buffer.from(
          arrayBuffer
        )

      console.log(
        `PDF recibido: ${buffer.length} bytes`
      )

      const resultado =
        await pdfParse(
          buffer
        )

      const textoExtraido =
        limpiarTexto(
          resultado.text
        )

      let texto =
        textoExtraido

      console.log(
        `Caracteres extraídos por PDF: ${textoExtraido.length}`
      )

      if (!texto) {
        texto =
          await extraerTextoConOcr(
            buffer,
            5
          )
      }

      const paginas =
        Number(
          resultado.numpages
        ) || null

      console.log(
        `Páginas detectadas: ${paginas}`
      )

      console.log(
        `Caracteres extraídos: ${texto.length}`
      )

      const title =
        detectarTitulo(
          texto
        )

      const author =
        detectarAutor(
          texto
        )

      const category =
        detectarCategoria(
          texto
        )

      const description =
        detectarDescripcion(
          texto,
          title
        )

      console.log(
        'Título detectado:',
        title
      )

      console.log(
        'Autor detectado:',
        author
      )

      console.log(
        'Categoría sugerida:',
        category
      )

      console.log(
        '========================================'
      )

      return res.json({
        ok: true,

        title,

        author,

        category,

        description,

        pages:
          paginas,

        textLength:
          texto.length,

        pdf_url,

        message:
          texto.length > 0
            ? 'PDF analizado correctamente.'
            : 'El PDF no contiene texto extraíble. Puede requerir OCR.'
      })

    } catch (error) {
      console.error(
        'ERROR AL ANALIZAR PDF:',
        error
      )

      return res.status(500).json({
        error:
          'Ocurrió un error al analizar el PDF.',

        detail:
          error?.message ||
          'Error desconocido.'
      })
    }
  }
)

/* =========================
   PDF PROXY
========================= */

app.get(
  '/api/library/books/:bookId/pdf',
  async (req, res) => {
    try {
      const {
        bookId
      } = req.params

      if (!bookId) {
        return res.status(400).json({
          error:
            'No se recibió el identificador del libro.'
        })
      }

      console.log(
        `Solicitando PDF del libro: ${bookId}`
      )

      /* =========================
         BUSCAR LIBRO EN SUPABASE
      ========================= */

      const {
        data: book,
        error: bookError
      } =
        await supabaseAdmin
          .from(
            'library_books'
          )
          .select(
            'id, title, pdf_url, active'
          )
          .eq(
            'id',
            bookId
          )
          .eq(
            'active',
            true
          )
          .single()

      if (bookError) {
        console.error(
          'Error al buscar libro:',
          bookError
        )

        return res.status(404).json({
          error:
            'No se encontró el libro.'
        })
      }

      if (!book.pdf_url) {
        return res.status(404).json({
          error:
            'El libro no tiene un PDF configurado.'
        })
      }

      /* =========================
         OBTENER ID DE GOOGLE DRIVE
      ========================= */

      const driveFileId =
        obtenerDriveFileId(
          book.pdf_url
        )

      if (!driveFileId) {
        console.error(
          'URL de Google Drive no reconocida:',
          book.pdf_url
        )

        return res.status(400).json({
          error:
            'La URL del PDF no tiene un formato de Google Drive válido.'
        })
      }

      console.log(
        `Libro: ${book.title}`
      )

      console.log(
        `Google Drive ID: ${driveFileId}`
      )

      /* =========================
         SOLICITAR PDF A DRIVE
      ========================= */

      const driveUrl =
        obtenerDriveDownloadUrl(
          driveFileId
        )

      const headers = {}

      if (
        req.headers.range
      ) {
        headers.Range =
          req.headers.range
      }

      const upstream =
        await fetch(
          driveUrl,
          {
            method: 'GET',
            headers
          }
        )

      console.log(
        `Google Drive respondió: ${upstream.status}`
      )

      if (!upstream.ok) {
        return res.status(502).json({
          error:
            'Google Drive no pudo entregar el PDF.',
          status:
            upstream.status
        })
      }

      /* =========================
         TIPO DE CONTENIDO
      ========================= */

      const upstreamContentType =
        upstream.headers.get(
          'content-type'
        )

      if (
        !upstreamContentType ||
        (
          !upstreamContentType.includes(
            'application/pdf'
          ) &&
          !upstreamContentType.includes(
            'application/octet-stream'
          )
        )
      ) {
        console.error(
          'Google Drive devolvió un tipo de contenido inesperado:',
          upstreamContentType
        )

        return res.status(502).json({
          error:
            'Google Drive no devolvió un archivo PDF.',
          contentType:
            upstreamContentType
        })
      }

      /* =========================
         HEADERS DEL PDF
      ========================= */

      res.status(
        upstream.status
      )

      res.setHeader(
        'Content-Type',
        'application/pdf'
      )

      const contentLength =
        upstream.headers.get(
          'content-length'
        )

      if (contentLength) {
        res.setHeader(
          'Content-Length',
          contentLength
        )
      }

      const contentRange =
        upstream.headers.get(
          'content-range'
        )

      if (contentRange) {
        res.setHeader(
          'Content-Range',
          contentRange
        )
      }

      const acceptRanges =
        upstream.headers.get(
          'accept-ranges'
        )

      if (acceptRanges) {
        res.setHeader(
          'Accept-Ranges',
          acceptRanges
        )
      } else {
        res.setHeader(
          'Accept-Ranges',
          'bytes'
        )
      }

      const etag =
        upstream.headers.get(
          'etag'
        )

      if (etag) {
        res.setHeader(
          'ETag',
          etag
        )
      }

      res.setHeader(
        'Cache-Control',
        'public, max-age=300'
      )

      /* =========================
         ENVIAR PDF AL NAVEGADOR
      ========================= */

      if (!upstream.body) {
        return res.status(502).json({
          error:
            'Google Drive no entregó contenido.'
        })
      }

      Readable
        .fromWeb(
          upstream.body
        )
        .pipe(
          res
        )

    } catch (error) {
      console.error(
        'ERROR EN PDF PROXY:',
        error
      )

      if (
        !res.headersSent
      ) {
        return res.status(500).json({
          error:
            'Error interno del servidor.'
        })
      }

      res.end()
    }
  }
)

/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Servidor iniciado en puerto ${PORT}`
    )

    console.log(
      `Frontend permitido: ${FRONTEND_ORIGIN}`
    )
  }
)