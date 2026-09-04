import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function TeacherAssignments() {
  const [docentes, setDocentes] = useState([])
  const [grados, setGrados] = useState([])
  const [secciones, setSecciones] = useState([])
  const [asignaciones, setAsignaciones] = useState([])

  const [docenteId, setDocenteId] = useState('')
  const [gradoId, setGradoId] = useState('')
  const [seccionId, setSeccionId] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (gradoId) {
      cargarSecciones()
    } else {
      setSecciones([])
      setSeccionId('')
    }
  }, [gradoId, anio])

  async function cargarDatos() {
    setCargando(true)

    const [docentesRes, gradosRes, asignacionesRes] =
      await Promise.all([
        supabase
          .from('teachers')
          .select(`
            id,
            employee_code,
            profiles (
              full_name
            )
          `)
          .eq('active', true)
          .order('employee_code'),

        supabase
          .from('grades')
          .select(`
            id,
            name,
            level_id,
            educational_levels (
              name
            )
          `)
          .eq('active', true)
          .order('sort_order'),

        supabase
          .from('teacher_section_assignments')
          .select(`
            id,
            teacher_id,
            section_id,
            teachers (
              employee_code,
              profiles (
                full_name
              )
            ),
            sections (
              id,
              name,
              academic_year,
              grades (
                name,
                educational_levels (
                  name
                )
              )
            )
          `)
          .order('id'),
      ])

    if (docentesRes.error) {
      console.error(docentesRes.error)
      alert(
        `Error al cargar docentes: ${docentesRes.error.message}`
      )
    }

    if (gradosRes.error) {
      console.error(gradosRes.error)
      alert(
        `Error al cargar grados: ${gradosRes.error.message}`
      )
    }

    if (asignacionesRes.error) {
      console.error(asignacionesRes.error)
      alert(
        `Error al cargar asignaciones: ${asignacionesRes.error.message}`
      )
    }

    setDocentes(docentesRes.data || [])
    setGrados(gradosRes.data || [])
    setAsignaciones(asignacionesRes.data || [])

    setCargando(false)
  }

  async function cargarSecciones() {
    const { data, error } = await supabase
      .from('sections')
      .select(`
        id,
        name,
        academic_year,
        grade_id
      `)
      .eq('grade_id', gradoId)
      .eq('academic_year', Number(anio))
      .eq('active', true)
      .order('name')

    if (error) {
      console.error(error)
      alert(`Error al cargar secciones: ${error.message}`)
      return
    }

    setSecciones(data || [])
    setSeccionId('')
  }

  async function asignarDocente(e) {
    e.preventDefault()

    if (!docenteId || !seccionId) {
      alert('Selecciona un docente y una sección.')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('teacher_section_assignments')
      .insert({
        teacher_id: docenteId,
        section_id: seccionId,
      })

    if (error) {
      console.error(error)

      if (error.code === '23505') {
        alert(
          'Este docente ya está asignado a esta sección.'
        )
      } else {
        alert(
          `Error al asignar docente: ${error.message}`
        )
      }

      setGuardando(false)
      return
    }

    alert('Docente asignado correctamente.')

    setDocenteId('')
    setGradoId('')
    setSeccionId('')
    setSecciones([])

    await cargarDatos()

    setGuardando(false)
  }

  async function eliminarAsignacion(id) {
    const confirmar = window.confirm(
      '¿Deseas eliminar esta asignación?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('teacher_section_assignments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert(`Error al eliminar: ${error.message}`)
      return
    }

    await cargarDatos()
  }

  return (
    <main className="assignment-page">

      {/* ENCABEZADO */}

      <header className="assignment-page-header">
        <h1>Asignación de docentes</h1>
        <p>
          Asigna docentes a sus grados y secciones
        </p>
      </header>

      {/* NUEVA ASIGNACIÓN */}

      <section className="assignment-form-card">

        <div className="assignment-form-header">

          <div className="assignment-form-icon">
            👨‍🏫
          </div>

          <div>
            <h2>Nueva asignación</h2>
            <p>
              Selecciona el docente y la sección que tendrá a su cargo.
            </p>
          </div>

        </div>

        <form
          className="assignment-form"
          onSubmit={asignarDocente}
        >

          {/* DOCENTE */}

          <div className="assignment-field assignment-field-full">
            <label>Docente</label>

            <select
              value={docenteId}
              onChange={(e) =>
                setDocenteId(e.target.value)
              }
              required
            >
              <option value="">
                Seleccionar docente
              </option>

              {docentes.map((docente) => (
                <option
                  key={docente.id}
                  value={docente.id}
                >
                  {docente.profiles?.full_name ||
                    'Sin nombre'}
                  {' - '}
                  {docente.employee_code}
                </option>
              ))}
            </select>
          </div>

          {/* AÑO */}

          <div className="assignment-field">
            <label>Año escolar</label>

            <select
              value={anio}
              onChange={(e) =>
                setAnio(e.target.value)
              }
            >
              {[2026, 2027, 2028, 2029, 2030].map(
                (año) => (
                  <option
                    key={año}
                    value={año}
                  >
                    {año}
                  </option>
                )
              )}
            </select>
          </div>

          {/* GRADO */}

          <div className="assignment-field">
            <label>Grado</label>

            <select
              value={gradoId}
              onChange={(e) =>
                setGradoId(e.target.value)
              }
              required
            >
              <option value="">
                Seleccionar grado
              </option>

              {grados.map((grado) => (
                <option
                  key={grado.id}
                  value={grado.id}
                >
                  {grado.educational_levels?.name}
                  {' - '}
                  {grado.name}
                </option>
              ))}
            </select>
          </div>

          {/* SECCIÓN */}

          <div className="assignment-field">
            <label>Sección</label>

            <select
              value={seccionId}
              onChange={(e) =>
                setSeccionId(e.target.value)
              }
              disabled={
                !gradoId ||
                secciones.length === 0
              }
              required
            >
              <option value="">
                {!gradoId
                  ? 'Primero selecciona un grado'
                  : secciones.length === 0
                    ? 'No hay secciones para este año'
                    : 'Seleccionar sección'}
              </option>

              {secciones.map((seccion) => (
                <option
                  key={seccion.id}
                  value={seccion.id}
                >
                  Sección {seccion.name}
                </option>
              ))}
            </select>
          </div>

          {/* BOTÓN */}

          <button
            className="assignment-submit"
            type="submit"
            disabled={guardando}
          >
            {guardando
              ? 'Asignando docente...'
              : 'Asignar docente'}
          </button>

        </form>
      </section>

      {/* ASIGNACIONES ACTUALES */}

      <section className="assignment-list-section">

        <div className="assignment-list-header">

          <div>
            <h2>Asignaciones actuales</h2>
            <p>
              Docentes responsables de cada grado y sección.
            </p>
          </div>

        </div>

        {cargando ? (

          <div className="assignment-empty">
            <div className="assignment-empty-icon">
              ⏳
            </div>

            <h3>
              Cargando asignaciones...
            </h3>
          </div>

        ) : asignaciones.length === 0 ? (

          <div className="assignment-empty">

            <div className="assignment-empty-icon">
              👨‍🏫
            </div>

            <h3>
              No hay asignaciones
            </h3>

            <p>
              Todavía no se ha asignado ningún docente
              a una sección.
            </p>

          </div>

        ) : (

          <div className="assignment-grid">

            {asignaciones.map((asignacion) => (

              <div
                className="assignment-card"
                key={asignacion.id}
              >

                {/* ICONO */}

                <div className="assignment-teacher-icon">
                  👨‍🏫
                </div>

                {/* INFORMACIÓN */}

                <div className="assignment-card-content">

                  <h3>
                    {asignacion.teachers?.profiles
                      ?.full_name ||
                      'Sin nombre'}
                  </h3>

                  <span className="assignment-teacher-code">
                    Código:{' '}
                    {asignacion.teachers
                      ?.employee_code ||
                      'Sin código'}
                  </span>

                  <div className="assignment-tags">

                    <span className="assignment-tag assignment-tag-year">
                      {asignacion.sections
                        ?.academic_year}
                    </span>

                    <span className="assignment-tag assignment-tag-grade">
                      {asignacion.sections?.grades
                        ?.educational_levels?.name}
                      {' - '}
                      {asignacion.sections?.grades
                        ?.name}
                    </span>

                    <span className="assignment-tag assignment-tag-section">
                      Sección{' '}
                      {asignacion.sections?.name}
                    </span>

                  </div>

                </div>

                {/* ELIMINAR */}

                <button
                  type="button"
                  className="assignment-delete"
                  title="Eliminar asignación"
                  onClick={() =>
                    eliminarAsignacion(
                      asignacion.id
                    )
                  }
                >
                  🗑️
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

    </main>
  )
}

export default TeacherAssignments