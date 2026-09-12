import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './StudentAgenda.css'

function StudentAgenda({ profile, cerrarSesion }) {
  const [student, setStudent] = useState(null)
  const [reviews, setReviews] = useState([])

  const [stats, setStats] = useState({
    total: 0,
    signed: 0,
    notPresent: 0,
    other: 0,
    percentage: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [profile?.id])

  async function cargarDatos() {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const { data: studentData, error: studentError } =
        await supabase
          .from('students')
          .select(`
            id,
            student_code,
            full_name
          `)
          .eq('profile_id', profile.id)
          .single()

      if (studentError) {
        console.error(
          'ERROR AL CARGAR ESTUDIANTE:',
          studentError
        )

        setError(
          'No se encontró el estudiante vinculado a esta cuenta.'
        )

        setLoading(false)
        return
      }

      setStudent(studentData)

      const { data: reviewsData, error: reviewsError } =
        await supabase
          .from('agenda_reviews')
          .select(`
            id,
            status,
            observation,
            created_at
          `)
          .eq('student_id', studentData.id)
          .order('created_at', {
            ascending: false,
          })

      if (reviewsError) {
        console.error(
          'ERROR AL CARGAR REVISIONES:',
          reviewsError
        )

        setError(
          'No se pudo cargar el historial de Agenda.'
        )

        setLoading(false)
        return
      }

      const lista = reviewsData || []

      setReviews(lista)

      calcularEstadisticas(lista)

    } catch (err) {
      console.error(
        'ERROR INESPERADO:',
        err
      )

      setError(
        'Ocurrió un error al cargar Mi Agenda.'
      )
    }

    setLoading(false)
  }

  function calcularEstadisticas(lista) {
    const total = lista.length

    const signed = lista.filter(
      (review) => review.status === 'signed'
    ).length

    const notPresent = lista.filter(
      (review) => review.status === 'not_present'
    ).length

    const other = lista.filter(
      (review) =>
        review.status !== 'signed' &&
        review.status !== 'not_present'
    ).length

    const percentage =
      total > 0
        ? Math.round((signed / total) * 100)
        : 0

    setStats({
      total,
      signed,
      notPresent,
      other,
      percentage,
    })
  }

  function formatearFecha(fecha) {
    if (!fecha) return ''

    return new Date(fecha).toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  function formatearHora(fecha) {
    if (!fecha) return ''

    return new Date(fecha).toLocaleTimeString(
      'es-PE',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  }

  function obtenerEstado(status) {
    switch (status) {
      case 'signed':
        return {
          texto: 'Presentada',
          clase: 'status-signed',
          icono: '✓',
        }

      case 'not_present':
        return {
          texto: 'No presentada',
          clase: 'status-not-present',
          icono: '!',
        }

      case 'no_signature':
        return {
          texto: 'Sin firma',
          clase: 'status-no-signature',
          icono: '!',
        }

      default:
        return {
          texto: 'Otra situación',
          clase: 'status-other',
          icono: '•',
        }
    }
  }

  if (loading) {
    return (
      <main className="student-agenda-page">
        <section className="student-agenda-loading">
          <div className="student-agenda-logo">
            AE
          </div>

          <h1>
            Mi Agenda
          </h1>

          <p>
            Cargando tu historial...
          </p>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="student-agenda-page">
        <section className="student-agenda-loading">
          <div className="student-agenda-logo">
            AE
          </div>

          <h1>
            Mi Agenda
          </h1>

          <p>
            {error}
          </p>

          <button
            className="agenda-back-button"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="student-agenda-page">

      <header className="student-agenda-header">

        <div className="agenda-header-left">

          <div className="student-agenda-logo">
            AE
          </div>

          <div>
            <h1>
              Agenda Escolar
            </h1>

            <p>
              Mi Agenda
            </p>
          </div>

        </div>

        <button
          className="student-agenda-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>

      </header>

      <section className="student-agenda-content">

        <div className="agenda-top">

          <div>
            <p className="agenda-label">
              MI AGENDA
            </p>

            <h2>
              Hola, {student.full_name}
            </h2>

            <p className="agenda-student-code">
              Código de estudiante:{' '}
              <strong>
                {student.student_code}
              </strong>
            </p>
          </div>

          <button
            className="agenda-back-button"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Volver al portal
          </button>

        </div>

        <section className="agenda-summary">

          <div className="agenda-summary-header">

            <div>
              <p className="agenda-label">
                RESUMEN
              </p>

              <h2>
                Cumplimiento de Agenda
              </h2>
            </div>

            <div className="agenda-percentage">
              {stats.percentage}%
            </div>

          </div>

          <div className="agenda-stats">

            <div className="agenda-stat">
              <span className="agenda-stat-number">
                {stats.total}
              </span>

              <span className="agenda-stat-label">
                Revisiones
              </span>
            </div>

            <div className="agenda-stat">
              <span className="agenda-stat-number">
                {stats.signed}
              </span>

              <span className="agenda-stat-label">
                Presentadas
              </span>
            </div>

            <div className="agenda-stat">
              <span className="agenda-stat-number">
                {stats.notPresent}
              </span>

              <span className="agenda-stat-label">
                No presentadas
              </span>
            </div>

            <div className="agenda-stat">
              <span className="agenda-stat-number">
                {stats.other}
              </span>

              <span className="agenda-stat-label">
                Otras
              </span>
            </div>

          </div>

        </section>

        <section className="agenda-history">

          <div className="agenda-section-title">

            <div>
              <p className="agenda-label">
                HISTORIAL
              </p>

              <h2>
                Mis revisiones de Agenda
              </h2>
            </div>

            <span className="agenda-history-count">
              {reviews.length} registros
            </span>

          </div>

          {reviews.length === 0 ? (

            <div className="agenda-empty">

              <div className="agenda-empty-icon">
                📅
              </div>

              <h3>
                Todavía no tienes revisiones
              </h3>

              <p>
                Cuando un tutor registre una revisión
                de tu Agenda, aparecerá aquí.
              </p>

            </div>

          ) : (

            <div className="agenda-review-list">

              {reviews.map((review) => {

                const estado =
                  obtenerEstado(review.status)

                return (
                  <article
                    className="agenda-review-item"
                    key={review.id}
                  >

                    <div
                      className={`agenda-status-icon ${estado.clase}`}
                    >
                      {estado.icono}
                    </div>

                    <div className="agenda-review-main">

                      <div className="agenda-review-top">

                        <div>
                          <h3>
                            Revisión de Agenda
                          </h3>

                          <p>
                            {formatearFecha(
                              review.created_at
                            )}{' '}
                            ·{' '}
                            {formatearHora(
                              review.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`agenda-status ${estado.clase}`}
                        >
                          {estado.texto}
                        </span>

                      </div>

                      {review.observation && (
                        <div className="agenda-observation">

                          <strong>
                            Observación:
                          </strong>

                          <p>
                            {review.observation}
                          </p>

                        </div>
                      )}

                    </div>

                  </article>
                )
              })}

            </div>
          )}

        </section>

      </section>

    </main>
  )
}

export default StudentAgenda