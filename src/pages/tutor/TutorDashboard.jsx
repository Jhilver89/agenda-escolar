import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function TutorDashboard({ profile, cerrarSesion }) {
  const navigate = useNavigate()

  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarSecciones()
  }, [])

  async function cargarSecciones() {
    setLoading(true)
    setError('')

    try {
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id, employee_code, active')
        .eq('id', profile.id)
        .single()

      if (teacherError) {
        console.error('ERROR AL BUSCAR DOCENTE:', teacherError)
        throw new Error('No se encontró el registro del docente.')
      }

      if (!teacher.active) {
        throw new Error('El registro del docente está inactivo.')
      }

      const { data, error: assignmentsError } = await supabase
        .from('teacher_section_assignments')
        .select(`
          id,
          section_id,
          sections (
            id,
            name,
            academic_year,
            active,
            grades (
              id,
              name,
              active,
              educational_levels (
                id,
                name
              )
            )
          )
        `)
        .eq('teacher_id', teacher.id)

      if (assignmentsError) {
        console.error(
          'ERROR AL CARGAR ASIGNACIONES:',
          assignmentsError
        )

        throw new Error(assignmentsError.message)
      }

      const seccionesActivas = (data || []).filter(
        (item) =>
          item.sections &&
          item.sections.active === true &&
          item.sections.grades &&
          item.sections.grades.active === true
      )

      setSecciones(seccionesActivas)

    } catch (err) {
      console.error('ERROR TUTOR:', err)

      setError(
        err.message ||
        'No se pudieron cargar las secciones asignadas.'
      )
    } finally {
      setLoading(false)
    }
  }

  function entrarSeccion(sectionId) {
    navigate(`/tutor/seccion/${sectionId}`)
  }

  return (
    <main className="tutor-dashboard-page">

      <header className="tutor-dashboard-header">

        <div className="tutor-brand">
          <div className="tutor-brand-logo">
            AE
          </div>

          <div>
            <h1>Agenda Escolar</h1>
            <p>Panel del Tutor</p>
          </div>
        </div>

        <div className="tutor-user-area">

          <div className="tutor-user-info">
            <span className="tutor-user-icon">
              👤
            </span>

            <span>
              {profile.full_name}
            </span>
          </div>

          <button
            type="button"
            className="tutor-logout-button"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>

        </div>

      </header>

      <section className="tutor-dashboard-content">

        <div className="tutor-welcome-card">

          <div className="tutor-welcome-icon">
            👨‍🏫
          </div>

          <div className="tutor-welcome-text">

            <span className="tutor-welcome-label">
              PANEL DEL TUTOR
            </span>

            <h2>
              Bienvenido, {profile.full_name}
            </h2>

            <p>
              Administra las revisiones de agendas,
              consulta el ranking y revisa los incentivos
              de tus secciones asignadas.
            </p>

          </div>

        </div>

        <div className="tutor-sections-heading">

          <div>
            <span className="tutor-heading-label">
              MIS SECCIONES
            </span>

            <h2>
              Secciones asignadas
            </h2>

            <p>
              Selecciona una sección para comenzar.
            </p>
          </div>

          {!loading && !error && secciones.length > 0 && (
            <div className="tutor-sections-count">
              <strong>{secciones.length}</strong>
              <span>
                {secciones.length === 1
                  ? 'sección asignada'
                  : 'secciones asignadas'}
              </span>
            </div>
          )}

        </div>

        {loading && (
          <div className="tutor-message-card">

            <div className="tutor-loading-icon">
              ⏳
            </div>

            <div>
              <h3>Cargando tus secciones</h3>
              <p>
                Estamos consultando las secciones asignadas.
              </p>
            </div>

          </div>
        )}

        {error && (
          <div className="tutor-message-card tutor-message-error">

            <div className="tutor-message-icon">
              ⚠️
            </div>

            <div>
              <h3>No se pudieron cargar las secciones</h3>
              <p>{error}</p>
            </div>

          </div>
        )}

        {!loading &&
          !error &&
          secciones.length === 0 && (

            <div className="tutor-message-card">

              <div className="tutor-message-icon">
                📚
              </div>

              <div>
                <h3>No tienes secciones asignadas</h3>

                <p>
                  Comunícate con el administrador para que
                  te asigne una sección.
                </p>
              </div>

            </div>
          )}

        {!loading &&
          !error &&
          secciones.length > 0 && (

            <div className="tutor-sections-grid">

              {secciones.map((asignacion) => {

                const section = asignacion.sections
                const grade = section?.grades
                const level = grade?.educational_levels

                return (

                  <article
                    className="tutor-section-card-new"
                    key={asignacion.id}
                  >

                    <div className="tutor-card-top">

                      <div className="tutor-school-icon">
                        🏫
                      </div>

                      <span className="tutor-year-badge">
                        {section?.academic_year}
                      </span>

                    </div>

                    <div className="tutor-section-level-new">
                      {level?.name || 'Nivel educativo'}
                    </div>

                    <h3>
                      {grade?.name || 'Grado'}
                    </h3>

                    <div className="tutor-section-name">
                      <span>Sección</span>
                      <strong>{section?.name}</strong>
                    </div>

                    <div className="tutor-card-divider" />

                    <div className="tutor-section-footer">

                      <div className="tutor-academic-year">
                        <span>📅</span>
                        Año académico {section?.academic_year}
                      </div>

                      <button
                        type="button"
                        className="tutor-enter-button"
                        onClick={() =>
                          entrarSeccion(section.id)
                        }
                      >
                        Ingresar
                        <span>→</span>
                      </button>

                    </div>

                  </article>

                )
              })}

            </div>
          )}

      </section>

    </main>
  )
}

export default TutorDashboard