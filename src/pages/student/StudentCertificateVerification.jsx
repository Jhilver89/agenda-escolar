import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './StudentCertificateVerification.css'

function StudentCertificateVerification() {
  const { certificateCode } = useParams()

  const [certificado, setCertificado] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    verificarCertificado()
  }, [certificateCode])

  async function verificarCertificado() {
    try {
      setLoading(true)
      setError('')
      setCertificado(null)

      if (!certificateCode) {
        setError(
          'No se recibió el código del certificado.'
        )

        return
      }

      /*
       * =========================
       * VERIFICAR CERTIFICADO
       * =========================
       */

      const codigo =
        decodeURIComponent(
          certificateCode
        ).trim()

      const {
        data,
        error: verificacionError,
      } = await supabase.rpc(
        'verify_library_certificate',
        {
          p_certificate_code:
            codigo,
        }
      )

      if (verificacionError) {
        console.error(
          'ERROR AL VERIFICAR CERTIFICADO:',
          verificacionError
        )

        setError(
          'No se pudo realizar la verificación del certificado.'
        )

        return
      }

      /*
       * La función devuelve una
       * tabla. Si no encuentra
       * certificado, data estará
       * vacía.
       */

      if (
        !data ||
        data.length === 0
      ) {
        setError(
          'El código ingresado no corresponde a un certificado válido.'
        )

        return
      }

      setCertificado(
        data[0]
      )
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL VERIFICAR CERTIFICADO:',
        err
      )

      setError(
        'Ocurrió un error al verificar el certificado.'
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

  function formatearTiempo(
    segundos
  ) {
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

  function formatearFecha(
    fecha
  ) {
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
   * CARGANDO
   * =========================
   */

  if (loading) {
    return (
      <main className="certificate-verification-page">

        <section className="certificate-verification-card">

          <div className="verification-loading-icon">
            ⟳
          </div>

          <h1>
            Verificando certificado
          </h1>

          <p>
            Estamos comprobando la autenticidad
            del certificado.
          </p>

        </section>

      </main>
    )
  }

  /*
   * =========================
   * CERTIFICADO NO VÁLIDO
   * =========================
   */

  if (
    error ||
    !certificado
  ) {
    return (
      <main className="certificate-verification-page">

        <section className="certificate-verification-card certificate-verification-invalid">

          <div className="verification-status-icon">
            ✕
          </div>

          <p className="verification-label">
            VERIFICACIÓN DE CERTIFICADO
          </p>

          <h1>
            Certificado no válido
          </h1>

          <p className="verification-message">
            {error ||
              'No se encontró un certificado asociado a este código.'}
          </p>

          <div className="verification-code-box">

            <span>
              Código consultado
            </span>

            <strong>
              {certificateCode}
            </strong>

          </div>

        </section>

      </main>
    )
  }

  /*
   * =========================
   * CERTIFICADO VÁLIDO
   * =========================
   */

  return (
    <main className="certificate-verification-page">

      <section className="certificate-verification-card">

        <div className="verification-header">

          <div className="verification-check-icon">
            ✓
          </div>

          <p className="verification-label">
            VERIFICACIÓN DE CERTIFICADO
          </p>

          <h1>
            Certificado válido
          </h1>

          <p className="verification-message">
            Este certificado ha sido verificado
            correctamente en la Biblioteca Digital.
          </p>

        </div>

        <div className="verification-divider" />

        <div className="verification-school">

          <strong>
            {certificado.school_name}
          </strong>

          <span>
            Biblioteca Digital
          </span>

        </div>

        <div className="verification-student">

          <span>
            ESTUDIANTE
          </span>

          <h2>
            {certificado.student_name}
          </h2>

        </div>

        <div className="verification-book">

          <span>
            OBRA LITERARIA
          </span>

          <h3>
            «{certificado.book_title}»
          </h3>

          {certificado.book_author && (
            <p>
              Autor: {certificado.book_author}
            </p>
          )}

        </div>

        <div className="verification-data-grid">

          <div className="verification-data-item">

            <span>
              Páginas
            </span>

            <strong>
              {certificado.total_pages}
            </strong>

          </div>

          <div className="verification-data-item">

            <span>
              Tiempo de lectura
            </span>

            <strong>
              {formatearTiempo(
                certificado.reading_seconds
              )}
            </strong>

          </div>

          <div className="verification-data-item">

            <span>
              Culminación
            </span>

            <strong>
              {formatearFecha(
                certificado.completed_at
              )}
            </strong>

          </div>

        </div>

        <div className="verification-footer">

          <div className="verification-validity">

            <span className="verification-validity-dot" />

            <span>
              Certificado emitido y vigente
            </span>

          </div>

          <div className="verification-code-box">

            <span>
              Código de certificado
            </span>

            <strong>
              {certificado.certificate_code}
            </strong>

          </div>

        </div>

        <div className="verification-notice">

          La información mostrada corresponde
          al registro oficial del certificado
          almacenado en la Biblioteca Digital.

        </div>

      </section>

    </main>
  )
}

export default StudentCertificateVerification