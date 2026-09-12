import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './StudentDashboard.css'

function StudentDashboard({ profile, cerrarSesion }) {
  const navigate = useNavigate()

  const [student, setStudent] = useState(null)

  const [agendaStats, setAgendaStats] = useState({
    total: 0,
    signed: 0,
    notPresent: 0,
    other: 0,
    percentage: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDatosEstudiante()
  }, [profile?.id])

  async function cargarDatosEstudiante() {
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
            full_name,
            active,
            section_id
          `)
          .eq('profile_id', profile.id)
          .single()

      if (studentError) {
        console.error(
          'ERROR AL CARGAR ESTUDIANTE:',
          studentError
        )

        setError(
          'Todavía no existe un estudiante vinculado a esta cuenta.'
        )

        setLoading(false)
        return
      }

      setStudent(studentData)

      const { data: reviews, error: reviewsError } =
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
          'No se pudo cargar el récord de Agenda.'
        )

        setLoading(false)
        return
      }

      calcularEstadisticas(reviews || [])
    } catch (err) {
      console.error(
        'ERROR INESPERADO:',
        err
      )

      setError(
        'Ocurrió un error al cargar el portal del estudiante.'
      )
    }

    setLoading(false)
  }

  function calcularEstadisticas(reviews) {
    const total = reviews.length

    const signed = reviews.filter(
      (review) => review.status === 'signed'
    ).length

    const notPresent = reviews.filter(
      (review) => review.status === 'not_present'
    ).length

    const other = reviews.filter(
      (review) =>
        review.status !== 'signed' &&
        review.status !== 'not_present'
    ).length

    const percentage =
      total > 0
        ? Math.round((signed / total) * 100)
        : 0

    setAgendaStats({
      total,
      signed,
      notPresent,
      other,
      percentage,
    })
  }

  if (loading) {
    return (
      <main className="login-page">
        <section className="login-card">

          <div className="login-header">

            <div className="logo">
              AE
            </div>

            <h1>
              Agenda Escolar
            </h1>

            <p>
              Cargando portal del estudiante...
            </p>

          </div>

        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="login-page">
        <section className="login-card">

          <div className="login-header">

            <div className="logo">
              AE
            </div>

            <h1>
              Agenda Escolar
            </h1>

            <p>
              {error}
            </p>

            <button
              className="login-button"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>

          </div>

        </section>
      </main>
    )
  }

  return (
    <main className="student-page">

      <header className="student-header">

        <div>

          <div className="student-logo">
            AE
          </div>

          <div>

            <h1>
              Agenda Escolar
            </h1>

            <p>
              Portal del estudiante
            </p>

          </div>

        </div>

        <button
          className="student-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>

      </header>

      <section className="student-content">

        <div className="student-welcome">

          <div>

            <p className="student-label">
              BIENVENIDO
            </p>

            <h2>
              Hola, {student.full_name}
            </h2>

            <p>
              Código de estudiante:{' '}
              <strong>
                {student.student_code}
              </strong>
            </p>

          </div>

        </div>

        <section className="student-cards">

          <article
            className="student-card student-card-clickable"
            onClick={() => {
              navigate('/estudiante/agenda')
            }}
          >

            <div className="student-card-icon">
              📅
            </div>

            <div>

              <h3>
                Mi Agenda
              </h3>

              <p>
                Consulta tu récord de presentación
                de agendas.
              </p>

              <span className="student-card-link">
                Ver mi Agenda →
              </span>

            </div>

          </article>

          <article
            className="student-card student-card-clickable"
            onClick={() => {
              navigate('/estudiante/biblioteca')
            }}
          >

            <div className="student-card-icon">
              📚
            </div>

            <div>

              <h3>
                Biblioteca Digital
              </h3>

              <p>
                Explora libros, cuentos y materiales
                para continuar aprendiendo.
              </p>

              <span className="student-card-link">
                Explorar biblioteca →
              </span>

            </div>

          </article>

          <article
            className="student-card student-card-clickable"
            onClick={() => {
              navigate('/estudiante/logros')
            }}
          >
            <div className="student-card-icon">
              🏆
            </div>

            <div>

              <h3>
                Mis logros
              </h3>

              <p>
                Consulta tus logros y
                reconocimientos de lectura.
              </p>

              <span className="student-card-link">
                Ver mis logros →
              </span>

            </div>
          </article>

          <article className="student-card">

            <div className="student-card-icon">
              🎓
            </div>

            <div>

              <h3>
                Certificados
              </h3>

              <p>
                Tus certificados de lectura
                aparecerán aquí.
              </p>

            </div>

          </article>

        </section>

        <section className="student-section">

          <div className="section-title">

            <div>

              <p className="student-label">
                MI RÉCORD
              </p>

              <h2>
                Cumplimiento de Agenda
              </h2>

            </div>

            <div className="agenda-percentage">
              {agendaStats.percentage}%
            </div>

          </div>

          <div className="stats-grid">

            <div className="stat-box">

              <span className="stat-number">
                {agendaStats.total}
              </span>

              <span className="stat-label">
                Revisiones
              </span>

            </div>

            <div className="stat-box">

              <span className="stat-number">
                {agendaStats.signed}
              </span>

              <span className="stat-label">
                Presentadas
              </span>

            </div>

            <div className="stat-box">

              <span className="stat-number">
                {agendaStats.notPresent}
              </span>

              <span className="stat-label">
                No presentadas
              </span>

            </div>

            <div className="stat-box">

              <span className="stat-number">
                {agendaStats.other}
              </span>

              <span className="stat-label">
                Otras
              </span>

            </div>

          </div>

        </section>

        <section className="student-section">

          <div className="section-title">

            <div>

              <p className="student-label">
                HISTORIAL
              </p>

              <h2>
                Últimas revisiones
              </h2>

            </div>

          </div>

          {agendaStats.total === 0 ? (

            <div className="empty-state">

              <div>
                📅
              </div>

              <p>
                Todavía no tienes revisiones
                registradas.
              </p>

            </div>

          ) : (

            <div className="history-list">

              <div className="history-item">

                <div className="history-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Récord de Agenda
                  </strong>

                  <p>
                    Tienes {agendaStats.signed}{' '}
                    presentaciones registradas.
                  </p>

                </div>

              </div>

            </div>

          )}

        </section>

      </section>

    </main>
  )
}

export default StudentDashboard