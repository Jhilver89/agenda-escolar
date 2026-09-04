import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function GradesSections() {
  const [niveles, setNiveles] = useState([])
  const [grados, setGrados] = useState([])
  const [gradoSeleccionado, setGradoSeleccionado] = useState(null)
  const [secciones, setSecciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nombreSeccion, setNombreSeccion] = useState('')
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)

    const { data: nivelesData, error: nivelesError } = await supabase
      .from('educational_levels')
      .select('*')
      .eq('active', true)

    if (nivelesError) {
      console.error('ERROR AL CARGAR NIVELES:', nivelesError)
      alert(`Error al cargar niveles: ${nivelesError.message}`)
      setCargando(false)
      return
    }

    const { data: gradosData, error: gradosError } = await supabase
      .from('grades')
      .select('*')
      .eq('active', true)
      .order('sort_order')

    if (gradosError) {
      console.error('ERROR AL CARGAR GRADOS:', gradosError)
      alert(`Error al cargar grados: ${gradosError.message}`)
      setCargando(false)
      return
    }

    setNiveles(nivelesData || [])
    setGrados(gradosData || [])
    setCargando(false)
  }

  async function seleccionarGrado(grado) {
    setGradoSeleccionado(grado)
    setMostrarFormulario(false)

    await cargarSecciones(grado.id, anio)
  }

  async function cargarSecciones(gradeId, academicYear) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('grade_id', gradeId)
      .eq('academic_year', Number(academicYear))
      .eq('active', true)
      .order('name')

    if (error) {
      console.error('ERROR AL CARGAR SECCIONES:', error)
      alert(`Error al cargar secciones: ${error.message}`)
      return
    }

    setSecciones(data || [])
  }

  async function cambiarAnio(nuevoAnio) {
    setAnio(nuevoAnio)

    if (gradoSeleccionado) {
      await cargarSecciones(gradoSeleccionado.id, nuevoAnio)
    }
  }

  async function agregarSeccion(e) {
    e.preventDefault()

    const nombre = nombreSeccion.trim().toUpperCase()

    if (!nombre) {
      alert('Ingrese el nombre de la sección.')
      return
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({
        grade_id: gradoSeleccionado.id,
        name: nombre,
        academic_year: Number(anio),
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('ERROR AL AGREGAR SECCIÓN:', error)
      alert(`Error al agregar sección: ${error.message}`)
      return
    }

    setSecciones([...secciones, data])
    setNombreSeccion('')
    setMostrarFormulario(false)
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Grados y secciones</h1>
          <p>Configuración de la estructura educativa</p>
        </div>
      </header>

      <section className="dashboard-content">
        <h2>Estructura educativa</h2>

        <div
          style={{
            marginBottom: '25px',
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
          }}
        >
          <label
            htmlFor="anio"
            style={{
              display: 'block',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            Año académico
          </label>

          <select
            id="anio"
            value={anio}
            onChange={(e) => cambiarAnio(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '16px',
            }}
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
            <option value={2029}>2029</option>
            <option value={2030}>2030</option>
          </select>
        </div>

        {cargando ? (
          <p>Cargando...</p>
        ) : (
          <>
            <div className="dashboard-grid">
              {niveles.map((nivel) => {
                const gradosDelNivel = grados.filter(
                  (grado) =>
                    String(grado.level_id) === String(nivel.id)
                )

                return (
                  <div className="dashboard-card" key={nivel.id}>
                    <div className="card-icon">🏫</div>

                    <h3>{nivel.name}</h3>

                    {gradosDelNivel.map((grado) => (
                      <button
                        key={grado.id}
                        onClick={() => seleccionarGrado(grado)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '8px',
                          padding: '10px',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background:
                            gradoSeleccionado?.id === grado.id
                              ? '#dbeafe'
                              : '#f1f5f9',
                        }}
                      >
                        {grado.name}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>

            {gradoSeleccionado && (
              <section
                className="dashboard-content"
                style={{ marginTop: '30px' }}
              >
                <h2>
                  Secciones de {gradoSeleccionado.name} — {anio}
                </h2>

                {secciones.length === 0 ? (
                  <p>
                    No hay secciones registradas para este grado
                    en {anio}.
                  </p>
                ) : (
                  <div className="dashboard-grid">
                    {secciones.map((seccion) => (
                      <div
                        className="dashboard-card"
                        key={seccion.id}
                      >
                        <div className="card-icon">📚</div>

                        <h3>
                          Sección {seccion.name}
                        </h3>

                        <p>
                          Año académico: {seccion.academic_year}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!mostrarFormulario ? (
                  <button
                    className="login-button"
                    type="button"
                    onClick={() => setMostrarFormulario(true)}
                  >
                    + Agregar sección
                  </button>
                ) : (
                  <form
                    onSubmit={agregarSeccion}
                    style={{
                      marginTop: '20px',
                      padding: '20px',
                      background: 'white',
                      borderRadius: '12px',
                    }}
                  >
                    <h3>Agregar sección</h3>

                    <div className="form-group">
                      <label>Sección</label>

                      <input
                        type="text"
                        value={nombreSeccion}
                        onChange={(e) =>
                          setNombreSeccion(e.target.value)
                        }
                        placeholder="Ejemplo: A"
                        maxLength={10}
                        required
                      />
                    </div>

                    <button
                      className="login-button"
                      type="submit"
                    >
                      Guardar sección
                    </button>

                    <button
                      type="button"
                      onClick={() => setMostrarFormulario(false)}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default GradesSections