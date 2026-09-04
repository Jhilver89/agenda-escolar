import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

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

function Incentives() {
  const [incentivos, setIncentivos] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [grados, setGrados] = useState([])
  const [secciones, setSecciones] = useState([])
  const [asociaciones, setAsociaciones] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [asociando, setAsociando] = useState(false)
  const [cargandoResultados, setCargandoResultados] = useState(false)

  const [error, setError] = useState('')
  const [resultadosIncentivo, setResultadosIncentivo] = useState(null)
  const [asociacionSeleccionada, setAsociacionSeleccionada] = useState(null)

  const [formulario, setFormulario] = useState({
    name: '',
    description: '',
    reward: '',
    minimum_percentage: '',
    minimum_points: '',
  })

  const [asociacion, setAsociacion] = useState({
    incentive_id: '',
    period_id: '',
    grade_id: '',
    section_id: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (asociacion.grade_id && asociacion.period_id) {
      cargarSecciones()
    } else {
      setSecciones([])
      setAsociacion((anterior) => ({
        ...anterior,
        section_id: '',
      }))
    }
  }, [asociacion.grade_id, asociacion.period_id])

  async function cargarDatos() {
    setCargando(true)
    setError('')

    const [
      incentivosResult,
      periodosResult,
      gradosResult,
      asociacionesResult,
    ] = await Promise.all([
      supabase
        .from('incentives')
        .select('*')
        .order('minimum_percentage', { ascending: true }),

      supabase
        .from('periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false }),

      supabase
        .from('grades')
        .select(`
          id,
          name,
          sort_order,
          educational_levels (
            name
          )
        `)
        .eq('active', true)
        .order('sort_order'),

      supabase
        .from('period_incentives')
        .select(`
          id,
          incentive_id,
          period_id,
          section_id,
          incentives (
            name,
            reward,
            minimum_percentage
          ),
          periods (
            name,
            year,
            month
          ),
          sections (
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
        .order('created_at', { ascending: false }),
    ])

    if (incentivosResult.error) {
      console.error(incentivosResult.error)
      setError('No se pudieron cargar los incentivos.')
    } else {
      setIncentivos(incentivosResult.data || [])
    }

    if (periodosResult.error) {
      console.error(periodosResult.error)
    } else {
      setPeriodos(periodosResult.data || [])
    }

    if (gradosResult.error) {
      console.error(gradosResult.error)
    } else {
      setGrados(gradosResult.data || [])
    }

    if (asociacionesResult.error) {
      console.error(asociacionesResult.error)
    } else {
      setAsociaciones(asociacionesResult.data || [])
    }

    setCargando(false)
  }

  async function cargarSecciones() {
    const periodoSeleccionado = periodos.find(
      (periodo) => periodo.id === asociacion.period_id
    )

    if (!periodoSeleccionado) return

    const { data, error } = await supabase
      .from('sections')
      .select('id, name, academic_year')
      .eq('grade_id', asociacion.grade_id)
      .eq('academic_year', periodoSeleccionado.year)
      .eq('active', true)
      .order('name')

    if (error) {
      console.error(error)
      setSecciones([])
      return
    }

    setSecciones(data || [])
  }

  function cambiarFormulario(e) {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  function cambiarAsociacion(e) {
    const { name, value } = e.target

    setAsociacion((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  async function guardarIncentivo(e) {
    e.preventDefault()

    if (!formulario.name.trim()) {
      alert('Ingresa el nombre del incentivo.')
      return
    }

    if (!formulario.reward.trim()) {
      alert('Ingresa el premio.')
      return
    }

    if (
      formulario.minimum_percentage === '' ||
      Number(formulario.minimum_percentage) < 0 ||
      Number(formulario.minimum_percentage) > 100
    ) {
      alert('El porcentaje debe estar entre 0 y 100.')
      return
    }

    setGuardando(true)
    setError('')

    const { error } = await supabase
      .from('incentives')
      .insert({
        name: formulario.name.trim(),
        description: formulario.description.trim() || null,
        reward: formulario.reward.trim(),
        minimum_percentage: Number(formulario.minimum_percentage),
        minimum_points:
          formulario.minimum_points === ''
            ? null
            : Number(formulario.minimum_points),
        active: true,
      })

    if (error) {
      console.error(error)
      setError('No se pudo guardar el incentivo.')
      setGuardando(false)
      return
    }

    setFormulario({
      name: '',
      description: '',
      reward: '',
      minimum_percentage: '',
      minimum_points: '',
    })

    await cargarDatos()

    setGuardando(false)
  }

  async function asociarIncentivo(e) {
    e.preventDefault()

    if (!asociacion.incentive_id) {
      alert('Selecciona un incentivo.')
      return
    }

    if (!asociacion.period_id) {
      alert('Selecciona un período.')
      return
    }

    if (!asociacion.grade_id) {
      alert('Selecciona un grado.')
      return
    }

    if (!asociacion.section_id) {
      alert('Selecciona una sección.')
      return
    }

    setAsociando(true)

    const { error } = await supabase
      .from('period_incentives')
      .insert({
        incentive_id: asociacion.incentive_id,
        period_id: asociacion.period_id,
        section_id: asociacion.section_id,
      })

    if (error) {
      console.error(error)

      if (error.code === '23505') {
        alert('Este incentivo ya está asociado a esa sección y período.')
      } else {
        alert('No se pudo asociar el incentivo.')
      }

      setAsociando(false)
      return
    }

    alert('Incentivo asociado correctamente.')

    setAsociacion({
      incentive_id: '',
      period_id: '',
      grade_id: '',
      section_id: '',
    })

    await cargarDatos()

    setAsociando(false)
  }

  async function cambiarEstado(incentivo) {
    const { error } = await supabase
      .from('incentives')
      .update({
        active: !incentivo.active,
      })
      .eq('id', incentivo.id)

    if (error) {
      console.error(error)
      alert('No se pudo cambiar el estado.')
      return
    }

    cargarDatos()
  }

  async function eliminarAsociacion(id) {
    const confirmar = window.confirm(
      '¿Deseas quitar esta asociación?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('period_incentives')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert('No se pudo quitar la asociación.')
      return
    }

    cargarDatos()
  }

  async function verResultados(item) {
    setCargandoResultados(true)
    setResultadosIncentivo(null)
    setAsociacionSeleccionada(item)

    const [estudiantesResult, diasResult] = await Promise.all([
      supabase.from('students').select('*')
        .eq('section_id', item.section_id).eq('active', true).order('full_name'),
      supabase.from('review_days').select('*')
        .eq('period_id', item.period_id).eq('section_id', item.section_id)
        .eq('is_review_day', true).order('review_date'),
    ])

    if (estudiantesResult.error || diasResult.error) {
      console.error(estudiantesResult.error || diasResult.error)
      alert('No se pudieron cargar los datos del incentivo.')
      setCargandoResultados(false)
      return
    }

    const estudiantes = estudiantesResult.data || []
    const dias = diasResult.data || []
    let revisiones = []

    if (dias.length > 0) {
      const { data, error } = await supabase.from('agenda_reviews')
        .select('*').in('review_day_id', dias.map((dia) => dia.id))

      if (error) {
        console.error(error)
        alert('No se pudieron cargar las revisiones.')
        setCargandoResultados(false)
        return
      }
      revisiones = data || []
    }

    const incentivo = item.incentives
    const totalDias = dias.length

    const resultados = estudiantes.map((student) => {
      const revisionesAlumno = revisiones.filter(
        (review) => review.student_id === student.id
      )
      const puntos = revisionesAlumno.filter(
        (review) => review.status === 'signed'
      ).length
      const diasRegistrados = revisionesAlumno.length
      const pendientes = Math.max(totalDias - diasRegistrados, 0)
      const porcentaje = totalDias > 0
        ? Math.round((puntos / totalDias) * 100)
        : 0

      const cumplePorcentaje =
        porcentaje >= Number(incentivo?.minimum_percentage || 0)

      const cumplePuntos =
        incentivo?.minimum_points == null ||
        puntos >= Number(incentivo.minimum_points)

      return {
        ...student,
        puntos,
        diasRegistrados,
        pendientes,
        porcentaje,
        gano: cumplePorcentaje && cumplePuntos,
      }
    }).sort((a, b) => {
      if (b.gano !== a.gano) return Number(b.gano) - Number(a.gano)
      if (b.puntos !== a.puntos) return b.puntos - a.puntos
      if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje
      return a.full_name.localeCompare(b.full_name)
    })

    setResultadosIncentivo({
      totalDias,
      ganadores: resultados.filter((student) => student.gano),
      noGanadores: resultados.filter((student) => !student.gano),
    })
    setCargandoResultados(false)
  }

  function cerrarResultados() {
    setResultadosIncentivo(null)
    setAsociacionSeleccionada(null)
  }

  function nombreGrado(grado) {
    if (!grado) return ''

    const nivel = grado.educational_levels?.name

    return nivel
      ? `${grado.name} - ${nivel}`
      : grado.name
  }

  return (
    <main className="agenda-reviews-page">

      {/* ENCABEZADO */}

      <div className="agenda-selection-card">

        <div className="agenda-selection-title">
          <span className="agenda-title-icon">🎁</span>

          <div>
            <h1>Incentivos</h1>

            <p>
              Configura premios y metas para los estudiantes.
            </p>
          </div>
        </div>

      </div>

      {/* CREAR INCENTIVO */}

      <section className="agenda-calendar-card">

        <h2>Nuevo incentivo</h2>

        <form onSubmit={guardarIncentivo}>

          <div className="agenda-selection-grid">

            <div className="agenda-field">
              <label>Nombre del incentivo</label>

              <input
                type="text"
                name="name"
                value={formulario.name}
                onChange={cambiarFormulario}
                placeholder="Ejemplo: Premio mensual"
              />
            </div>

            <div className="agenda-field">
              <label>Premio</label>

              <input
                type="text"
                name="reward"
                value={formulario.reward}
                onChange={cambiarFormulario}
                placeholder="Ejemplo: 2 chocolates"
              />
            </div>

            <div className="agenda-field">
              <label>Porcentaje mínimo (%)</label>

              <input
                type="number"
                name="minimum_percentage"
                value={formulario.minimum_percentage}
                onChange={cambiarFormulario}
                min="0"
                max="100"
                placeholder="Ejemplo: 90"
              />
            </div>

            <div className="agenda-field">
              <label>Puntos mínimos</label>

              <input
                type="number"
                name="minimum_points"
                value={formulario.minimum_points}
                onChange={cambiarFormulario}
                min="0"
                placeholder="Opcional"
              />
            </div>

          </div>

          <div className="agenda-field">

            <label>Descripción</label>

            <textarea
              name="description"
              value={formulario.description}
              onChange={cambiarFormulario}
              placeholder="Describe el incentivo..."
              rows="3"
            />

          </div>

          {error && (
            <p className="agenda-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="agenda-primary-button"
          >
            {guardando
              ? 'Guardando...'
              : 'Agregar incentivo'}
          </button>

        </form>

      </section>

      {/* INCENTIVOS */}

      <section className="agenda-students-section">

        <div className="agenda-students-header">

          <div>
            <h2>Incentivos configurados</h2>

            <p>
              Premios disponibles para asociarlos a períodos y secciones.
            </p>
          </div>

        </div>

        {cargando ? (

          <div className="agenda-loading">
            Cargando incentivos...
          </div>

        ) : incentivos.length === 0 ? (

          <div className="agenda-empty">
            Todavía no hay incentivos configurados.
          </div>

        ) : (

          <div className="incentives-grid">

            {incentivos.map((incentivo) => (

              <article
                key={incentivo.id}
                className={`incentive-card ${
                  incentivo.active
                    ? 'incentive-active'
                    : 'incentive-inactive'
                }`}
              >

                <div className="incentive-icon">
                  🎁
                </div>

                <div className="incentive-content">

                  <div className="incentive-header">

                    <h3>{incentivo.name}</h3>

                    <span
                      className={
                        incentivo.active
                          ? 'incentive-status active'
                          : 'incentive-status inactive'
                      }
                    >
                      {incentivo.active
                        ? 'Activo'
                        : 'Inactivo'}
                    </span>

                  </div>

                  <p className="incentive-description">
                    {incentivo.description ||
                      'Sin descripción.'}
                  </p>

                  <div className="incentive-data">

                    <div>
                      <span>Premio</span>
                      <strong>
                        {incentivo.reward}
                      </strong>
                    </div>

                    <div>
                      <span>Mínimo</span>
                      <strong>
                        {incentivo.minimum_percentage}%
                      </strong>
                    </div>

                    {incentivo.minimum_points !== null && (
                      <div>
                        <span>Puntos</span>
                        <strong>
                          {incentivo.minimum_points}
                        </strong>
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    className="incentive-toggle"
                    onClick={() =>
                      cambiarEstado(incentivo)
                    }
                  >
                    {incentivo.active
                      ? 'Desactivar'
                      : 'Activar'}
                  </button>

                </div>

              </article>

            ))}

          </div>

        )}

      </section>

      {/* ASOCIAR INCENTIVO */}

      <section className="agenda-calendar-card">

        <h2>Asociar incentivo</h2>

        <p>
          Define a qué período, grado y sección se aplicará el premio.
        </p>

        <form onSubmit={asociarIncentivo}>

          <div className="agenda-selection-grid">

            <div className="agenda-field">

              <label>Incentivo</label>

              <select
                name="incentive_id"
                value={asociacion.incentive_id}
                onChange={cambiarAsociacion}
              >
                <option value="">
                  Seleccionar incentivo
                </option>

                {incentivos
                  .filter((incentivo) => incentivo.active)
                  .map((incentivo) => (
                    <option
                      key={incentivo.id}
                      value={incentivo.id}
                    >
                      {incentivo.name} — {incentivo.reward}
                    </option>
                  ))}
              </select>

            </div>

            <div className="agenda-field">

              <label>Período</label>

              <select
                name="period_id"
                value={asociacion.period_id}
                onChange={cambiarAsociacion}
              >
                <option value="">
                  Seleccionar período
                </option>

                {periodos.map((periodo) => (
                  <option
                    key={periodo.id}
                    value={periodo.id}
                  >
                    {periodo.name} ({periodo.year})
                  </option>
                ))}

              </select>

            </div>

            <div className="agenda-field">

              <label>Grado</label>

              <select
                name="grade_id"
                value={asociacion.grade_id}
                onChange={cambiarAsociacion}
              >
                <option value="">
                  Seleccionar grado
                </option>

                {grados.map((grado) => (
                  <option
                    key={grado.id}
                    value={grado.id}
                  >
                    {nombreGrado(grado)}
                  </option>
                ))}

              </select>

            </div>

            <div className="agenda-field">

              <label>Sección</label>

              <select
                name="section_id"
                value={asociacion.section_id}
                onChange={cambiarAsociacion}
                disabled={
                  !asociacion.grade_id ||
                  !asociacion.period_id
                }
              >
                <option value="">
                  Seleccionar sección
                </option>

                {secciones.map((seccion) => (
                  <option
                    key={seccion.id}
                    value={seccion.id}
                  >
                    {seccion.name}
                  </option>
                ))}

              </select>

            </div>

          </div>

          <button
            type="submit"
            disabled={asociando}
            className="agenda-primary-button"
          >
            {asociando
              ? 'Asociando...'
              : 'Asociar incentivo'}
          </button>

        </form>

      </section>

      {/* ASOCIACIONES ACTUALES */}

      <section className="agenda-students-section">

        <div className="agenda-students-header">

          <div>
            <h2>Incentivos asignados</h2>

            <p>
              Incentivos actualmente asociados a períodos y secciones.
            </p>
          </div>

        </div>

        {asociaciones.length === 0 ? (

          <div className="agenda-empty">
            Todavía no hay incentivos asignados.
          </div>

        ) : (

          <div className="incentives-grid">

            {asociaciones.map((item) => {

              const grado =
                item.sections?.grades

              const nivel =
                grado?.educational_levels?.name

              return (
                <article
                  key={item.id}
                  className="incentive-card incentive-active"
                >

                  <div className="incentive-icon">
                    🏆
                  </div>

                  <div className="incentive-content">

                    <div className="incentive-header">

                      <h3>
                        {item.incentives?.name}
                      </h3>

                      <span className="incentive-status active">
                        Asignado
                      </span>

                    </div>

                    <p className="incentive-description">
                      {item.incentives?.reward}
                    </p>

                    <div className="incentive-data">

                      <div>
                        <span>Período</span>

                        <strong>
                          {item.periods?.name}{' '}
                          {item.periods?.year}
                        </strong>
                      </div>

                      <div>
                        <span>Grado</span>

                        <strong>
                          {grado?.name}
                        </strong>
                      </div>

                      <div>
                        <span>Nivel</span>

                        <strong>
                          {nivel}
                        </strong>
                      </div>

                      <div>
                        <span>Sección</span>

                        <strong>
                          {item.sections?.name}
                        </strong>
                      </div>

                      <div>
                        <span>Mínimo</span>

                        <strong>
                          {item.incentives?.minimum_percentage}%
                        </strong>
                      </div>

                    </div>

                    <button
                      type="button"
                      className="agenda-primary-button"
                      onClick={() => verResultados(item)}
                    >
                      🏆 Ver ganadores
                    </button>

                    <button
                      type="button"
                      className="incentive-toggle"
                      onClick={() =>
                        eliminarAsociacion(item.id)
                      }
                    >
                      Quitar asociación
                    </button>

                  </div>

                </article>
              )
            })}

          </div>

        )}

      </section>


      {resultadosIncentivo && (
        <section className="agenda-students-section incentive-results-section">
          <div className="agenda-students-header">
            <div>
              <h2>🏆 Resultados del incentivo</h2>
              <p>
                {asociacionSeleccionada?.incentives?.name}
                {' · '}
                {asociacionSeleccionada?.periods?.name}
                {' · '}
                {asociacionSeleccionada?.sections?.grades?.name}
                {' · Sección '}
                {asociacionSeleccionada?.sections?.name}
              </p>
            </div>

            <button
              type="button"
              className="incentive-toggle"
              onClick={cerrarResultados}
            >
              Cerrar resultados
            </button>
          </div>

          <div className="agenda-statistics">
            <div className="agenda-stat">
              <div className="agenda-stat-icon total">📅</div>
              <div>
                <strong>{resultadosIncentivo.totalDias}</strong>
                <span>Días válidos</span>
              </div>
            </div>

            <div className="agenda-stat">
              <div className="agenda-stat-icon signed">🏆</div>
              <div>
                <strong>{resultadosIncentivo.ganadores.length}</strong>
                <span>Ganadores</span>
              </div>
            </div>

            <div className="agenda-stat">
              <div className="agenda-stat-icon pending">🎯</div>
              <div>
                <strong>
                  {asociacionSeleccionada?.incentives?.minimum_percentage}%
                </strong>
                <span>Meta mínima</span>
              </div>
            </div>

            <div className="agenda-stat">
              <div className="agenda-stat-icon signed">🎁</div>
              <div>
                <strong>{asociacionSeleccionada?.incentives?.reward}</strong>
                <span>Premio</span>
              </div>
            </div>
          </div>

          {cargandoResultados ? (
            <div className="agenda-loading">Calculando resultados...</div>
          ) : resultadosIncentivo.ganadores.length === 0 ? (
            <div className="agenda-empty">
              <div>🎯</div>
              <h3>Todavía no hay ganadores</h3>
              <p>Ningún estudiante ha alcanzado la meta establecida.</p>
            </div>
          ) : (
            <div className="incentive-winners-grid">
              {resultadosIncentivo.ganadores.map((student) => (
                <article key={student.id} className="incentive-winner-card">
                  <div className="incentive-winner-icon">🏆</div>

                  <div className="agenda-student-avatar">
                    {obtenerAvatar(student.avatar_key)}
                  </div>

                  <div className="incentive-winner-content">
                    <h3>{student.full_name}</h3>
                    <span>Código: {student.student_code}</span>

                    <div className="incentive-winner-data">
                      <div>
                        <strong>{student.porcentaje}%</strong>
                        <span>cumplimiento</span>
                      </div>
                      <div>
                        <strong>{student.puntos}</strong>
                        <span>puntos</span>
                      </div>
                      <div>
                        <strong>{resultadosIncentivo.totalDias}</strong>
                        <span>días válidos</span>
                      </div>
                    </div>

                    <div className="incentive-winner-reward">
                      🎁 {asociacionSeleccionada?.incentives?.reward}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {resultadosIncentivo.noGanadores.length > 0 && (
            <div className="incentive-non-winners">
              <h3>Estudiantes que aún no alcanzan la meta</h3>

              <div className="incentive-non-winners-list">
                {resultadosIncentivo.noGanadores.map((student) => (
                  <div key={student.id} className="incentive-non-winner-card">
                    <div className="agenda-student-avatar">
                      {obtenerAvatar(student.avatar_key)}
                    </div>

                    <div>
                      <strong>{student.full_name}</strong>
                      <span>
                        {student.porcentaje}% · {student.puntos} puntos
                      </span>
                    </div>

                    <strong className="incentive-missing">
                      Falta{' '}
                      {Math.max(
                        Number(asociacionSeleccionada?.incentives?.minimum_percentage || 0)
                          - student.porcentaje,
                        0
                      )}
                      %
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

    </main>
  )
}

export default Incentives