import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './StudentCertificates.css'

function StudentCertificates({
  profile,
  cerrarSesion,
}) {
  const navigate = useNavigate()

  const [certificados, setCertificados] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    cargarCertificados()
  }, [profile?.id])

  async function cargarCertificados() {
    if (!profile?.id) {
      return
    }

    try {
      setLoading(true)
      setError('')

      /*
       * Buscar al estudiante vinculado
       * al perfil autenticado.
       */
      const {
        data: student,
        error: studentError,
      } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('active', true)
        .single()

      if (studentError) {
        console.error(
          'ERROR AL CARGAR ESTUDIANTE:',
          studentError
        )

        setError(
          'No se pudo identificar al estudiante.'
        )

        return
      }

      /*
       * Cargar solamente los certificados
       * pertenecientes al estudiante.
       */
      const {
        data,
        error: certificadosError,
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
        .eq('student_id', student.id)
        .eq('status', 'issued')
        .order('issued_at', {
          ascending: false,
        })

      if (certificadosError) {
        console.error(
          'ERROR AL CARGAR CERTIFICADOS:',
          certificadosError
        )

        setError(
          'No se pudieron cargar tus certificados.'
        )

        return
      }

      setCertificados(data || [])
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL CARGAR CERTIFICADOS:',
        err
      )

      setError(
        'Ocurrió un error al cargar tus certificados.'
      )
    } finally {
      setLoading(false)
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return ''
    }

    const fechaObjeto = new Date(fecha)

    if (Number.isNaN(fechaObjeto.getTime())) {
      return ''
    }

    return fechaObjeto.toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  function formatearTiempo(segundos) {
    const total = Math.max(
      0,
      Math.floor(Number(segundos) || 0)
    )

    const horas = Math.floor(
      total / 3600
    )

    const minutos = Math.floor(
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

  function verCertificado(certificadoId) {
    navigate(
      `/estudiante/biblioteca/certificado/${certificadoId}`
    )
  }

  if (loading) {
    return (
      <main className="student-certificates-page">
        <header className="student-certificates-header">
          <div>
            <button
              type="button"
              className="student-certificates-back"
              onClick={() =>
                navigate('/estudiante')
              }
            >
              ← Portal
            </button>

            <div className="student-certificates-title">
              <span>🎓</span>

              <div>
                <p>
                  BIBLIOTECA DIGITAL
                </p>

                <h1>
                  Mis certificados
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="student-certificates-logout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="student-certificates-content">
          <div className="student-certificates-loading">
            <div>
              🎓
            </div>

            <h2>
              Cargando tus certificados...
            </h2>

            <p>
              Estamos buscando tus certificados de lectura.
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="student-certificates-page">
        <header className="student-certificates-header">
          <div>
            <button
              type="button"
              className="student-certificates-back"
              onClick={() =>
                navigate('/estudiante')
              }
            >
              ← Portal
            </button>

            <div className="student-certificates-title">
              <span>🎓</span>

              <div>
                <p>
                  BIBLIOTECA DIGITAL
                </p>

                <h1>
                  Mis certificados
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="student-certificates-logout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="student-certificates-content">
          <div className="student-certificates-error">
            <div>
              ⚠
            </div>

            <h2>
              No se pudieron cargar tus certificados
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={cargarCertificados}
            >
              Intentar nuevamente
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="student-certificates-page">
      <header className="student-certificates-header">
        <div>
          <button
            type="button"
            className="student-certificates-back"
            onClick={() =>
              navigate('/estudiante')
            }
          >
            ← Portal
          </button>

          <div className="student-certificates-title">
            <span>🎓</span>

            <div>
              <p>
                BIBLIOTECA DIGITAL
              </p>

              <h1>
                Mis certificados
              </h1>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="student-certificates-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="student-certificates-content">
        <div className="student-certificates-summary">
          <div>
            <p className="student-certificates-label">
              MIS RECONOCIMIENTOS
            </p>

            <h2>
              Certificados de lectura
            </h2>

            <p>
              Aquí encontrarás los certificados que
              obtengas al completar tus lecturas.
            </p>
          </div>

          <div className="student-certificates-counter">
            <strong>
              {certificados.length}
            </strong>

            <span>
              {certificados.length === 1
                ? 'certificado obtenido'
                : 'certificados obtenidos'}
            </span>
          </div>
        </div>

        {certificados.length === 0 ? (
          <div className="student-certificates-empty">
            <div>
              🎓
            </div>

            <h2>
              Todavía no tienes certificados
            </h2>

            <p>
              Completa un libro de la Biblioteca
              Digital para obtener tu certificado
              de lectura.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/estudiante/biblioteca')
              }
            >
              Ir a la biblioteca
            </button>
          </div>
        ) : (
          <section className="student-certificates-grid">
            {certificados.map((certificado) => (
              <article
                key={certificado.id}
                className="student-certificate-card"
              >
                <div className="student-certificate-card-top">
                  <div className="student-certificate-icon">
                    🎓
                  </div>

                  <div>
                    <p className="student-certificate-status">
                      CERTIFICADO DE LECTURA
                    </p>

                    <h3>
                      {certificado.book_title}
                    </h3>

                    <p className="student-certificate-author">
                      {certificado.book_author ||
                        'Autor no registrado'}
                    </p>
                  </div>
                </div>

                <div className="student-certificate-details">
                  <div>
                    <span>
                      Páginas
                    </span>

                    <strong>
                      {certificado.total_pages}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Tiempo de lectura
                    </span>

                    <strong>
                      {formatearTiempo(
                        certificado.reading_seconds
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Culminado
                    </span>

                    <strong>
                      {formatearFecha(
                        certificado.completed_at
                      )}
                    </strong>
                  </div>
                </div>

                <div className="student-certificate-code">
                  <span>
                    Código
                  </span>

                  <strong>
                    {certificado.certificate_code}
                  </strong>
                </div>

                <div className="student-certificate-actions">
                  <button
                    type="button"
                    className="student-certificate-view-button"
                    onClick={() =>
                      verCertificado(
                        certificado.id
                      )
                    }
                  >
                    Ver certificado
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="student-certificates-footer-actions">
          <button
            type="button"
            className="student-certificates-library-button"
            onClick={() =>
              navigate('/estudiante/biblioteca')
            }
          >
            ← Volver a la biblioteca
          </button>
        </div>
      </section>
    </main>
  )
}

export default StudentCertificates
