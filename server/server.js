import 'dotenv/config'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { Readable } from 'node:stream'

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
    'GET, OPTIONS'
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

/* =========================
   PDF PROXY
========================= */

app.get(
  '/api/library/books/:bookId/pdf',
  async (req, res) => {
    try {
      const { bookId } = req.params

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
      } = await supabaseAdmin
        .from('library_books')
        .select(
          'id, title, pdf_url, active'
        )
        .eq('id', bookId)
        .eq('active', true)
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
        obtenerDriveFileId(book.pdf_url)

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
        `https://drive.google.com/uc?export=download&id=${driveFileId}`

      const headers = {}

      if (req.headers.range) {
        headers.Range = req.headers.range
      }

      const upstream = await fetch(
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
          status: upstream.status
        })
      }

      /* =========================
         TIPO DE CONTENIDO
      ========================= */

      const upstreamContentType =
        upstream.headers.get(
          'content-type'
        )

      /*
       * Google Drive puede entregar
       * archivos PDF como:
       *
       * application/pdf
       *
       * o:
       *
       * application/octet-stream
       *
       * Ambos son aceptados.
       */

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

      /*
       * Independientemente de cómo lo etiquete
       * Google Drive, nuestro proxy lo entrega
       * al navegador como PDF.
       */

      const contentType =
        'application/pdf'

      /* =========================
         HEADERS DEL PDF
      ========================= */

      res.status(upstream.status)

      res.setHeader(
        'Content-Type',
        contentType
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
        .fromWeb(upstream.body)
        .pipe(res)

    } catch (error) {
      console.error(
        'ERROR EN PDF PROXY:',
        error
      )

      if (!res.headersSent) {
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

app.listen(PORT, () => {
  console.log(
    `Servidor iniciado en puerto ${PORT}`
  )

  console.log(
    `Frontend permitido: ${FRONTEND_ORIGIN}`
  )
})