import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'
import './StudentCertificate.css'

function StudentCertificate() {
  const { certificateId } = useParams()

  const [certificado, setCertificado] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [descargando, setDescargando] =
    useState(false)

  useEffect(() => {
    cargarCertificado()
  }, [certificateId])

  async function cargarCertificado() {
    try {
      setLoading(true)
      setError('')

      if (!certificateId) {
        setError(
          'No se recibió el identificador del certificado.'
        )

        return
      }

      /*
       * =========================
       * BUSCAR CERTIFICADO
       * =========================
       */

      const {
        data,
        error: certificadoError,
      } = await supabase
        .from('library_certificates')
        .select(`
          id,
          certificate_code,
          school_name,
          school_logo_url,
          student_name,
          book_title,
          book_author,
          total_pages,
          reading_seconds,
          completed_at,
          issued_at,
          status
        `)
        .eq('id', certificateId)
        .eq('status', 'issued')
        .single()

      if (certificadoError) {
        console.error(
          'ERROR AL CARGAR CERTIFICADO:',
          certificadoError
        )

        setError(
          'No se pudo encontrar el certificado.'
        )

        return
      }

      setCertificado(data)
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL CARGAR CERTIFICADO:',
        err
      )

      setError(
        'Ocurrió un error al cargar el certificado.'
      )
    } finally {
      setLoading(false)
    }
  }

  /*
   * =========================
   * FORMATO DEL TIEMPO
   * =========================
   */

  function formatearTiempo(segundos) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(segundos) || 0
        )
      )

    const horas =
      Math.floor(
        total / 3600
      )

    const minutos =
      Math.floor(
        (total % 3600) / 60
      )

    const segundosRestantes =
      total % 60

    if (horas > 0) {
      return `${horas} h ${String(
        minutos
      ).padStart(2, '0')} min`
    }

    if (minutos > 0) {
      return `${minutos} min ${String(
        segundosRestantes
      ).padStart(2, '0')} s`
    }

    return `${segundosRestantes} s`
  }

  /*
   * =========================
   * FORMATO DE FECHA
   * =========================
   */

  function formatearFecha(fecha) {
    if (!fecha) {
      return ''
    }

    return new Date(
      fecha
    ).toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  /*
   * =========================
   * FECHA PARA PDF
   * =========================
   */

  function formatearFechaPDF(fecha) {
    if (!fecha) {
      return ''
    }

    return new Date(
      fecha
    ).toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  /*
   * =========================
   * URL DE VERIFICACIÓN
   * =========================
   */

  function obtenerUrlVerificacion() {
    if (!certificado) {
      return ''
    }

    return (
      `${window.location.origin}` +
      `/verificar-certificado/` +
      `${encodeURIComponent(
        certificado.certificate_code
      )}`
    )
  }

  /*
   * =========================
   * CONVERTIR IMAGEN A DATA URL
   * =========================
   */

  async function obtenerImagenDataURL(url) {
    if (!url) {
      console.warn(
        'No existe URL del logo.'
      )

      return null
    }

    let objectUrl = null

    try {
      const respuesta = await fetch(
        url,
        {
          mode: 'cors',
          cache: 'no-cache',
        }
      )

      if (!respuesta.ok) {
        throw new Error(
          `No se pudo cargar el logo. Estado: ${respuesta.status}`
        )
      }

      const blob = await respuesta.blob()

      if (!blob.type.startsWith('image/')) {
        throw new Error(
          `El archivo no es una imagen válida. Tipo: ${blob.type}`
        )
      }

      objectUrl = URL.createObjectURL(blob)

      const dataURL = await new Promise(
        (resolve, reject) => {
          const imagen = new Image()

          imagen.onload = () => {
            try {
              const maxAncho = 1000
              const maxAlto = 500

              let ancho = imagen.naturalWidth || imagen.width
              let alto = imagen.naturalHeight || imagen.height

              if (!ancho || !alto) {
                throw new Error(
                  'No se pudo obtener el tamaño del logo.'
                )
              }

              const escala = Math.min(
                1,
                maxAncho / ancho,
                maxAlto / alto
              )

              ancho = Math.max(
                1,
                Math.round(ancho * escala)
              )

              alto = Math.max(
                1,
                Math.round(alto * escala)
              )

              const canvas =
                document.createElement('canvas')

              canvas.width = ancho
              canvas.height = alto

              const contexto =
                canvas.getContext('2d')

              if (!contexto) {
                throw new Error(
                  'No se pudo crear el contexto del logo.'
                )
              }

              contexto.fillStyle = '#ffffff'
              contexto.fillRect(
                0,
                0,
                ancho,
                alto
              )

              contexto.drawImage(
                imagen,
                0,
                0,
                ancho,
                alto
              )

              resolve(
                canvas.toDataURL(
                  'image/jpeg',
                  0.82
                )
              )
            } catch (err) {
              reject(err)
            }
          }

          imagen.onerror = () => {
            reject(
              new Error(
                'No se pudo cargar la imagen del logo.'
              )
            )
          }

          imagen.src = objectUrl
        }
      )

      return dataURL
    } catch (err) {
      console.error(
        'ERROR AL PREPARAR LOGO PARA PDF:',
        err
      )

      return null
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }

  /*
   * =========================
   * GENERAR QR
   * =========================
   */

  async function generarQRCodeDataURL() {
    const url =
      obtenerUrlVerificacion()

    if (!url) {
      return null
    }

    try {
      return await QRCode.toDataURL(
        url,
        {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 500,
        }
      )
    } catch (err) {
      console.error(
        'ERROR AL GENERAR QR:',
        err
      )

      return null
    }
  }

  /*
   * =========================
   * DESCARGAR CERTIFICADO
   * =========================
   */

  async function descargarCertificado() {
    if (
      !certificado ||
      descargando
    ) {
      return
    }

    try {
      setDescargando(true)

      /*
       * =========================
       * PREPARAR LOGO Y QR
       * =========================
       */

      const [
        logoDataURL,
        qrDataURL,
      ] = await Promise.all([
        obtenerImagenDataURL(
          certificado.school_logo_url
        ),
        generarQRCodeDataURL(),
      ])

      console.log(
        'LOGO PARA PDF:',
        logoDataURL
          ? 'CARGADO CORRECTAMENTE'
          : 'NO SE PUDO CARGAR'
      )

      console.log(
        'QR PARA PDF:',
        qrDataURL
          ? 'GENERADO CORRECTAMENTE'
          : 'NO SE PUDO GENERAR'
      )

      /*
       * =========================
       * PDF HORIZONTAL A4
       * =========================
       */

      const pdf =
        new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        })

      const ancho =
        pdf.internal.pageSize.getWidth()

      const alto =
        pdf.internal.pageSize.getHeight()

      /*
       * =========================
       * FONDO
       * =========================
       */

      pdf.setFillColor(
        248,
        250,
        252
      )

      pdf.rect(
        0,
        0,
        ancho,
        alto,
        'F'
      )

      /*
       * =========================
       * BORDE EXTERIOR
       * =========================
       */

      pdf.setDrawColor(
        216,
        201,
        138
      )

      pdf.setLineWidth(1.2)

      pdf.rect(
        8,
        8,
        ancho - 16,
        alto - 16
      )

      /*
       * =========================
       * BORDE INTERIOR
       * =========================
       */

      pdf.setLineWidth(0.4)

      pdf.rect(
        13,
        13,
        ancho - 26,
        alto - 26
      )

      /*
       * =========================
       * LOGO
       * =========================
       */

      if (logoDataURL) {
        try {
          const logoAncho = 58
          const logoAlto = 17

          pdf.addImage(
            logoDataURL,
            'JPEG',
            ancho / 2 -
              logoAncho / 2,
            15,
            logoAncho,
            logoAlto
          )
        } catch (err) {
          console.error(
            'ERROR AL INSERTAR LOGO EN PDF:',
            err
          )
        }
      }

      /*
       * =========================
       * ENCABEZADO
       * =========================
       */

      pdf.setTextColor(
        122,
        107,
        44
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(8)

      pdf.text(
        'BIBLIOTECA DIGITAL',
        ancho / 2,
        39,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * TÍTULO
       * =========================
       */

      pdf.setTextColor(
        23,
        37,
        84
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(27)

      pdf.text(
        'CERTIFICADO DE LECTURA',
        ancho / 2,
        55,
        {
          align: 'center',
        }
      )

      pdf.setDrawColor(
        216,
        201,
        138
      )

      pdf.setLineWidth(0.8)

      pdf.line(
        ancho / 2 - 28,
        61,
        ancho / 2 + 28,
        61
      )

      /*
       * =========================
       * TEXTO PRINCIPAL
       * =========================
       */

      pdf.setTextColor(
        100,
        116,
        139
      )

      pdf.setFont(
        'helvetica',
        'normal'
      )

      pdf.setFontSize(12)

      pdf.text(
        'Se certifica que',
        ancho / 2,
        74,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * ESTUDIANTE
       * =========================
       */

      pdf.setTextColor(
        23,
        37,
        84
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(20)

      pdf.text(
        certificado.student_name,
        ancho / 2,
        86,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * DESCRIPCIÓN
       * =========================
       */

      pdf.setTextColor(
        71,
        85,
        105
      )

      pdf.setFont(
        'helvetica',
        'normal'
      )

      pdf.setFontSize(11)

      pdf.text(
        'ha culminado satisfactoriamente la lectura de la obra:',
        ancho / 2,
        98,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * LIBRO
       * =========================
       */

      pdf.setTextColor(
        23,
        53,
        116
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(17)

      pdf.text(
        `«${certificado.book_title}»`,
        ancho / 2,
        111,
        {
          align: 'center',
        }
      )

      if (
        certificado.book_author
      ) {
        pdf.setTextColor(
          100,
          116,
          139
        )

        pdf.setFont(
          'helvetica',
          'normal'
        )

        pdf.setFontSize(10)

        pdf.text(
          `Autor: ${certificado.book_author}`,
          ancho / 2,
          119,
          {
            align: 'center',
          }
        )
      }

      /*
       * =========================
       * DATOS
       * =========================
       */

      const cajasY = 130

      const cajaAncho = 60

      const cajaAlto = 23

      const separacion = 6

      const totalAncho =
        cajaAncho * 3 +
        separacion * 2

      const inicioX =
        (ancho - totalAncho) / 2

      const datos = [
        {
          titulo: 'PÁGINAS',
          valor:
            String(
              certificado.total_pages ||
                0
            ),
        },
        {
          titulo: 'TIEMPO DE LECTURA',
          valor:
            formatearTiempo(
              certificado.reading_seconds
            ),
        },
        {
          titulo: 'FECHA DE CULMINACIÓN',
          valor:
            formatearFechaPDF(
              certificado.completed_at
            ),
        },
      ]

      datos.forEach(
        (dato, index) => {
          const x =
            inicioX +
            index *
              (
                cajaAncho +
                separacion
              )

          pdf.setFillColor(
            248,
            250,
            252
          )

          pdf.setDrawColor(
            226,
            232,
            240
          )

          pdf.setLineWidth(0.4)

          pdf.roundedRect(
            x,
            cajasY,
            cajaAncho,
            cajaAlto,
            3,
            3,
            'FD'
          )

          pdf.setTextColor(
            100,
            116,
            139
          )

          pdf.setFont(
            'helvetica',
            'bold'
          )

          pdf.setFontSize(6.5)

          pdf.text(
            dato.titulo,
            x +
              cajaAncho / 2,
            cajasY + 7,
            {
              align: 'center',
            }
          )

          pdf.setTextColor(
            23,
            53,
            116
          )

          pdf.setFontSize(10)

          pdf.text(
            dato.valor,
            x +
              cajaAncho / 2,
            cajasY + 16,
            {
              align: 'center',
            }
          )
        }
      )

      /*
       * =========================
       * PIE
       * =========================
       */

      const pieY = 169

      /*
       * =========================
       * FIRMA
       * =========================
       */

      pdf.setDrawColor(
        100,
        116,
        139
      )

      pdf.setLineWidth(0.3)

      pdf.line(
        38,
        pieY,
        98,
        pieY
      )

      pdf.setTextColor(
        51,
        65,
        85
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(8)

      pdf.text(
        'Biblioteca Digital',
        68,
        pieY + 6,
        {
          align: 'center',
        }
      )

      pdf.setFont(
        'helvetica',
        'normal'
      )

      pdf.setFontSize(7)

      pdf.text(
        certificado.school_name ||
          'Colegio Vancouver',
        68,
        pieY + 11,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * CÓDIGO
       * =========================
       */

      const codigoX =
        ancho - 72

      pdf.setTextColor(
        100,
        116,
        139
      )

      pdf.setFont(
        'helvetica',
        'normal'
      )

      pdf.setFontSize(6.5)

      pdf.text(
        'CÓDIGO DE CERTIFICADO',
        codigoX,
        pieY + 2,
        {
          align: 'center',
        }
      )

      pdf.setTextColor(
        23,
        53,
        116
      )

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(9)

      pdf.text(
        certificado.certificate_code,
        codigoX,
        pieY + 9,
        {
          align: 'center',
        }
      )

      /*
       * =========================
       * QR
       * =========================
       */

      if (qrDataURL) {
        try {
          const qrSize = 18

          const qrX =
            ancho - 36

          const qrY =
            157

          pdf.addImage(
            qrDataURL,
            'PNG',
            qrX,
            qrY,
            qrSize,
            qrSize
          )

          pdf.setTextColor(
            100,
            116,
            139
          )

          pdf.setFont(
            'helvetica',
            'normal'
          )

          pdf.setFontSize(5.5)

          pdf.text(
            'ESCANEA PARA VERIFICAR',
            qrX +
              qrSize / 2,
            qrY + qrSize + 3,
            {
              align: 'center',
            }
          )
        } catch (err) {
          console.error(
            'ERROR AL INSERTAR QR EN PDF:',
            err
          )
        }
      }

      /*
       * =========================
       * DESCARGAR
       * =========================
       */

      const nombreEstudiante =
        (
          certificado.student_name ||
          'estudiante'
        )
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            ''
          )
          .replace(
            /[^a-zA-Z0-9]+/g,
            '_'
          )
          .replace(
            /^_+|_+$/g,
            ''
          )

      const nombreArchivo =
        `Certificado_${nombreEstudiante}_${certificado.certificate_code}.pdf`

      pdf.save(
        nombreArchivo
      )
    } catch (err) {
      console.error(
        'ERROR AL GENERAR CERTIFICADO:',
        err
      )

      window.alert(
        'No se pudo generar el certificado PDF.'
      )
    } finally {
      setDescargando(false)
    }
  }

  /*
   * =========================
   * VOLVER
   * =========================
   */

  function volverBiblioteca() {
    window.location.href =
      '/estudiante/biblioteca'
  }

  /*
   * =========================
   * CARGANDO
   * =========================
   */

  if (loading) {
    return (
      <main className="student-certificate-page">

        <div className="student-certificate-loading">

          <div className="certificate-loading-icon">
            📜
          </div>

          <h2>
            Cargando certificado...
          </h2>

          <p>
            Preparando tu certificado de lectura.
          </p>

        </div>

      </main>
    )
  }

  /*
   * =========================
   * ERROR
   * =========================
   */

  if (
    error ||
    !certificado
  ) {
    return (
      <main className="student-certificate-page">

        <div className="student-certificate-error">

          <div className="certificate-error-icon">
            ⚠
          </div>

          <h2>
            No se pudo cargar el certificado
          </h2>

          <p>
            {error ||
              'El certificado no está disponible.'}
          </p>

          <button
            className="certificate-back-button"
            onClick={
              volverBiblioteca
            }
          >
            ← Volver a la biblioteca
          </button>

        </div>

      </main>
    )
  }

  /*
   * =========================
   * CERTIFICADO
   * =========================
   */

  return (
    <main className="student-certificate-page">

      <div className="certificate-actions">

        <button
          className="certificate-back-button"
          onClick={
            volverBiblioteca
          }
        >
          ← Volver a la biblioteca
        </button>

        <button
          className="certificate-download-button"
          onClick={
            descargarCertificado
          }
          disabled={descargando}
        >
          {descargando
            ? 'Generando certificado...'
            : 'Exportar certificado'}
        </button>

      </div>

      <section className="certificate-wrapper">

        <article className="student-certificate">

          <div className="certificate-border">

            <header className="certificate-header">

              {certificado.school_logo_url ? (

                <img
                  className="certificate-school-logo"
                  src={
                    certificado.school_logo_url
                  }
                  alt={
                    `Logo de ${certificado.school_name}`
                  }
                />

              ) : (

                <div className="certificate-school-logo-placeholder">
                  AE
                </div>

              )}

              <p className="certificate-label">
                BIBLIOTECA DIGITAL
              </p>

            </header>

            <div className="certificate-title-section">

              <p className="certificate-small-title">
                CERTIFICADO
              </p>

              <h1>
                DE LECTURA
              </h1>

              <div className="certificate-title-line" />

            </div>

            <div className="certificate-content">

              <p className="certificate-intro">
                Se certifica que
              </p>

              <h2 className="certificate-student-name">
                {certificado.student_name}
              </h2>

              <p className="certificate-description">
                ha culminado satisfactoriamente
                la lectura de la obra:
              </p>

              <h3 className="certificate-book-title">
                «{certificado.book_title}»
              </h3>

              {certificado.book_author && (

                <p className="certificate-book-author">
                  Autor: {certificado.book_author}
                </p>

              )}

              <div className="certificate-data-grid">

                <div className="certificate-data-item">

                  <span>
                    Páginas
                  </span>

                  <strong>
                    {certificado.total_pages}
                  </strong>

                </div>

                <div className="certificate-data-item">

                  <span>
                    Tiempo de lectura
                  </span>

                  <strong>
                    {formatearTiempo(
                      certificado.reading_seconds
                    )}
                  </strong>

                </div>

                <div className="certificate-data-item">

                  <span>
                    Fecha de culminación
                  </span>

                  <strong>
                    {formatearFecha(
                      certificado.completed_at
                    )}
                  </strong>

                </div>

              </div>

            </div>

            <footer className="certificate-footer">

              <div className="certificate-signature">

                <div className="certificate-signature-line" />

                <strong>
                  Biblioteca Digital
                </strong>

                <span>
                  {certificado.school_name}
                </span>

              </div>

              <div className="certificate-code">

                <span>
                  Código de certificado
                </span>

                <strong>
                  {certificado.certificate_code}
                </strong>

              </div>

              <div className="certificate-qr">

                <img
                  src={
                    `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                      obtenerUrlVerificacion()
                    )}`
                  }
                  alt="Código QR para verificar el certificado"
                />

                <span>
                  Escanea para verificar
                </span>

              </div>

            </footer>

          </div>

        </article>

      </section>

    </main>
  )
}

export default StudentCertificate