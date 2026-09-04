import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Students() {
  const [grados, setGrados] = useState([])
  const [secciones, setSecciones] = useState([])
  const [estudiantes, setEstudiantes] = useState([])

  const [anio, setAnio] = useState(new Date().getFullYear())
  const [gradoId, setGradoId] = useState('')
  const [seccionId, setSeccionId] = useState('')

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [avatar, setAvatar] = useState('dinosaur-1')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const avatares = [
    { key: 'dinosaur-1', icon: '🦖' },
    { key: 'dinosaur-2', icon: '🦕' },
    { key: 'dinosaur-3', icon: '🦴' },
    { key: 'dinosaur-4', icon: '🐊' },
    { key: 'dinosaur-5', icon: '🐲' },
    { key: 'dinosaur-6', icon: '🥚' },
  ]

  useEffect(() => {
    cargarGrados()
  }, [])

  useEffect(() => {
    if (gradoId) {
      cargarSecciones()
    } else {
      setSecciones([])
      setSeccionId('')
      setEstudiantes([])
    }
  }, [gradoId, anio])

  useEffect(() => {
    if (seccionId) {
      cargarEstudiantes()
    } else {
      setEstudiantes([])
    }
  }, [seccionId])

  async function cargarGrados() {
    const { data, error } = await supabase
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
      .order('sort_order')

    if (error) {
      console.error('ERROR AL CARGAR GRADOS:', error)
      alert(`Error al cargar grados: ${error.message}`)
      return
    }

    setGrados(data || [])
  }

  async function cargarSecciones() {
    const { data, error } = await supabase
      .from('sections')
      .select(`
        id,
        name,
        academic_year
      `)
      .eq('grade_id', gradoId)
      .eq('academic_year', Number(anio))
      .eq('active', true)
      .order('name')

    if (error) {
      console.error('ERROR AL CARGAR SECCIONES:', error)
      alert(`Error al cargar secciones: ${error.message}`)
      return
    }

    setSecciones(data || [])
    setSeccionId('')
    setEstudiantes([])
  }

  async function cargarEstudiantes() {
    setCargando(true)

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        full_name,
        avatar_key,
        active,
        enrollment_date,
        withdrawal_date
      `)
      .eq('section_id', seccionId)
      .order('full_name')

    if (error) {
      console.error('ERROR AL CARGAR ESTUDIANTES:', error)
      alert(`Error al cargar estudiantes: ${error.message}`)
      setCargando(false)
      return
    }

    setEstudiantes(data || [])
    setCargando(false)
  }

  async function registrarEstudiante(e) {
    e.preventDefault()

    if (!seccionId) {
      alert('Selecciona primero una sección.')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('students')
      .insert({
        section_id: seccionId,
        student_code: codigo.trim(),
        full_name: nombre.trim(),
        avatar_key: avatar,
        active: true,
        enrollment_date: new Date()
          .toISOString()
          .split('T')[0],
      })

    if (error) {
      console.error('ERROR AL REGISTRAR ESTUDIANTE:', error)

      if (error.code === '23505') {
        alert('El código del estudiante ya existe.')
      } else {
        alert(`Error al registrar estudiante: ${error.message}`)
      }

      setGuardando(false)
      return
    }

    alert('Estudiante registrado correctamente.')

    setNombre('')
    setCodigo('')
    setAvatar('dinosaur-1')
    setMostrarFormulario(false)

    await cargarEstudiantes()

    setGuardando(false)
  }

  async function cambiarEstado(estudiante) {
    const nuevoEstado = !estudiante.active

    const { error } = await supabase
      .from('students')
      .update({
        active: nuevoEstado,
        withdrawal_date: nuevoEstado
          ? null
          : new Date().toISOString().split('T')[0],
      })
      .eq('id', estudiante.id)

    if (error) {
      console.error('ERROR AL CAMBIAR ESTADO:', error)
      alert(`Error al actualizar estudiante: ${error.message}`)
      return
    }

    await cargarEstudiantes()
  }

  function obtenerAvatar(avatarKey) {
    const encontrado = avatares.find(
      (avatar) => avatar.key === avatarKey
    )

    return encontrado?.icon || '🦖'
  }

  const gradoSeleccionado = grados.find(
    (grado) => grado.id === gradoId
  )

  const seccionSeleccionada = secciones.find(
    (seccion) => seccion.id === seccionId
  )

  return (
    <main className="students-page">

      <header className="students-page-header">
        <div className="students-title-icon">🎓</div>
        <div>
          <h1>Estudiantes</h1>
          <p>Registrar y administrar estudiantes</p>
        </div>
      </header>

      <section className="students-content">

        <div className="students-section-card">

          <div className="students-card-header">
            <div className="students-card-icon">🏫</div>
            <div>
              <h2>Seleccionar sección</h2>
              <p>Elige el año, grado y sección para administrar a los estudiantes.</p>
            </div>
          </div>

          <div className="students-selection-grid">

            <div className="students-field">
              <label>Año escolar</label>
              <select
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              >
                {[2026, 2027, 2028, 2029, 2030].map((año) => (
                  <option key={año} value={año}>
                    {año}
                  </option>
                ))}
              </select>
            </div>

            <div className="students-field">
              <label>Grado</label>
              <select
                value={gradoId}
                onChange={(e) => setGradoId(e.target.value)}
              >
                <option value="">Seleccionar grado</option>
                {grados.map((grado) => (
                  <option key={grado.id} value={grado.id}>
                    {grado.educational_levels?.name} - {grado.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="students-field students-field-full">
              <label>Sección</label>
              <select
                value={seccionId}
                onChange={(e) => setSeccionId(e.target.value)}
                disabled={!gradoId || secciones.length === 0}
              >
                <option value="">
                  {!gradoId
                    ? 'Primero selecciona un grado'
                    : secciones.length === 0
                      ? 'No hay secciones para este año'
                      : 'Seleccionar sección'}
                </option>

                {secciones.map((seccion) => (
                  <option key={seccion.id} value={seccion.id}>
                    Sección {seccion.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {seccionId && (
          <>

            <div className="students-class-header">
              <div>
                <span className="students-class-label">SECCIÓN SELECCIONADA</span>
                <h2>
                  {gradoSeleccionado?.educational_levels?.name} - {gradoSeleccionado?.name}
                </h2>
                <p>
                  Sección {seccionSeleccionada?.name} · Año escolar {anio}
                </p>
              </div>

              {!mostrarFormulario && (
                <button
                  className="students-primary-button"
                  type="button"
                  onClick={() => setMostrarFormulario(true)}
                >
                  <span>＋</span> Registrar estudiante
                </button>
              )}
            </div>

            {mostrarFormulario && (
              <form
                className="students-form-card"
                onSubmit={registrarEstudiante}
              >
                <div className="students-form-header">
                  <div className="students-form-icon">👤</div>
                  <div>
                    <h2>Registrar estudiante</h2>
                    <p>Completa los datos del estudiante y selecciona su avatar.</p>
                  </div>
                </div>

                <div className="students-form-grid">

                  <div className="students-field">
                    <label htmlFor="nombre-estudiante">
                      Nombres y apellidos
                    </label>
                    <input
                      id="nombre-estudiante"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ejemplo: Juan Pérez García"
                      required
                    />
                  </div>

                  <div className="students-field">
                    <label htmlFor="codigo-estudiante">
                      Código del estudiante
                    </label>
                    <input
                      id="codigo-estudiante"
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ejemplo: EST001"
                      required
                    />
                  </div>

                  <div className="students-avatar-field students-field-full">
                    <label>Avatar del estudiante</label>

                    <div className="students-avatar-grid">
                      {avatares.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`students-avatar-option ${
                            avatar === item.key ? 'selected' : ''
                          }`}
                          onClick={() => setAvatar(item.key)}
                          title="Seleccionar avatar"
                        >
                          {item.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="students-form-actions">
                  <button
                    className="students-primary-button"
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando ? 'Registrando...' : 'Registrar estudiante'}
                  </button>

                  <button
                    className="students-secondary-button"
                    type="button"
                    onClick={() => setMostrarFormulario(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="students-list-header">
              <div>
                <h2>Estudiantes de la sección</h2>
                <p>
                  {estudiantes.length === 0
                    ? 'Todavía no hay estudiantes registrados.'
                    : `${estudiantes.length} estudiante${estudiantes.length !== 1 ? 's' : ''} registrado${estudiantes.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {estudiantes.length > 0 && (
                <div className="students-count-badge">
                  {estudiantes.length}
                </div>
              )}
            </div>

            {cargando ? (
              <div className="students-empty-card">
                <div className="students-empty-icon">⏳</div>
                <h3>Cargando estudiantes...</h3>
                <p>Estamos obteniendo la información de la sección.</p>
              </div>
            ) : estudiantes.length === 0 ? (
              <div className="students-empty-card">
                <div className="students-empty-icon">🎓</div>
                <h3>No hay estudiantes registrados</h3>
                <p>Registra los estudiantes de esta sección usando el botón superior.</p>
              </div>
            ) : (
              <div className="students-grid">
                {estudiantes.map((estudiante) => (
                  <div
                    className={`student-card ${
                      estudiante.active ? '' : 'student-card-inactive'
                    }`}
                    key={estudiante.id}
                  >
                    <div className="student-card-top">
                      <div className="student-avatar">
                        {obtenerAvatar(estudiante.avatar_key)}
                      </div>

                      <span
                        className={`student-status ${
                          estudiante.active ? 'active' : 'inactive'
                        }`}
                      >
                        {estudiante.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="student-card-info">
                      <h3>{estudiante.full_name}</h3>

                      <div className="student-code">
                        Código: {estudiante.student_code}
                      </div>
                    </div>

                    <div className="student-card-footer">
                      <button
                        type="button"
                        className={`student-status-button ${
                          estudiante.active ? 'deactivate' : 'activate'
                        }`}
                        onClick={() => cambiarEstado(estudiante)}
                      >
                        {estudiante.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </>
        )}

      </section>
    </main>
  )
}

export default Students