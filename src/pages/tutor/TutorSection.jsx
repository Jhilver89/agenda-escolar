import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function TutorSection() {
  const navigate = useNavigate()
  const { sectionId } = useParams()

  const [section, setSection] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarSeccion()
  }, [sectionId])

  async function cargarSeccion() {
    setLoading(true)
    setError('')

    try {
      const { data: sectionData, error: sectionError } =
        await supabase
          .from('sections')
          .select(`
            id,
            name,
            academic_year,
            active,
            grades (
              id,
              name,
              educational_levels (
                id,
                name
              )
            )
          `)
          .eq('id', sectionId)
          .single()

      if (sectionError) {
        throw sectionError
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from('students')
          .select(`
            id,
            student_code,
            full_name,
            avatar_key,
            active
          `)
          .eq('section_id', sectionId)
          .order('full_name')

      if (studentsError) {
        throw studentsError
      }

      setSection(sectionData)
      setStudents(studentsData || [])

    } catch (err) {
      console.error('ERROR AL CARGAR SECCIÓN:', err)
      setError(
        err.message ||
        'No se pudo cargar la información de la sección.'
      )
    } finally {
      setLoading(false)
    }
  }

  function obtenerAvatar(avatarKey) {
    const avatares = {
      'dinosaur-1': '🦖',
      'dinosaur-2': '🦕',
      'dinosaur-3': '🦴',
      'dinosaur-4': '🐊',
      'dinosaur-5': '🐲',
      'dinosaur-6': '🥚',
    }

    return avatares[avatarKey] || '🦖'
  }

  if (loading) {
    return (
      <main className="dashboard">
        <section className="dashboard-content">
          <div className="dashboard-card">
            <p>Cargando sección...</p>
          </div>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard">
        <section className="dashboard-content">
          <div className="dashboard-card">
            <h2>No se pudo cargar la sección</h2>
            <p>{error}</p>

            <button
              className="login-button"
              onClick={() => navigate('/')}
            >
              Volver
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard">

      <header className="dashboard-header">

        <div>
          <h1>Agenda Escolar</h1>
          <p>Sección del Tutor</p>
        </div>

        <div className="user-area">
          <button onClick={() => navigate('/')}>
            Volver a mis secciones
          </button>
        </div>

      </header>

      <section className="dashboard-content">

        <div className="tutor-section-header">

          <div>
            <span className="tutor-section-level">
              {section?.grades?.educational_levels?.name}
            </span>

            <h2>
              {section?.grades?.name} — Sección {section?.name}
            </h2>

            <p>
              Año académico {section?.academic_year}
            </p>
          </div>

          <div className="tutor-student-count">
            <strong>{students.length}</strong>
            <span>Estudiantes</span>
          </div>

        </div>

        <div className="tutor-actions-grid">

          <button
            className="tutor-action-card"
            onClick={() =>
              navigate(`/tutor/seccion/${sectionId}/revisiones`)
            }
          >
            <span className="tutor-action-icon">📋</span>

            <div>
              <h3>Revisar agendas</h3>
              <p>
                Registrar firmas, no presentación y observaciones.
              </p>
            </div>
          </button>

          <button
            className="tutor-action-card"
            onClick={() =>
              navigate(`/tutor/seccion/${sectionId}/ranking`)
            }
          >
            <span className="tutor-action-icon">🏆</span>

            <div>
              <h3>Ranking</h3>
              <p>
                Ver el desempeño de los estudiantes.
              </p>
            </div>
          </button>

          <button
            className="tutor-action-card"
            onClick={() =>
              navigate(`/tutor/seccion/${sectionId}/incentivos`)
            }
          >
            <span className="tutor-action-icon">🎁</span>

            <div>
              <h3>Incentivos</h3>
              <p>
                Consultar los premios y estudiantes que los obtienen.
              </p>
            </div>
          </button>

        </div>

        <div className="agenda-students-section">

          <div className="section-heading">
            <div>
              <h3>Estudiantes</h3>
              <p>
                Estudiantes registrados en esta sección.
              </p>
            </div>
          </div>

          {students.length === 0 ? (

            <div className="dashboard-card">
              <p>
                No hay estudiantes registrados en esta sección.
              </p>
            </div>

          ) : (

            <div className="tutor-students-grid">

              {students.map((student) => (

                <article
                  className="tutor-student-card"
                  key={student.id}
                >

                  <div className="tutor-student-avatar">
                    {obtenerAvatar(student.avatar_key)}
                  </div>

                  <div className="tutor-student-info">

                    <h4>{student.full_name}</h4>

                    <span>
                      Código: {student.student_code}
                    </span>

                  </div>

                  <span
                    className={
                      student.active
                        ? 'student-status active'
                        : 'student-status inactive'
                    }
                  >
                    {student.active ? 'Activo' : 'Inactivo'}
                  </span>

                </article>

              ))}

            </div>

          )}

        </div>

      </section>

    </main>
  )
}

export default TutorSection