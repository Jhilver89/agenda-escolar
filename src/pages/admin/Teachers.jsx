import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Teachers() {
  const [docentes, setDocentes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    cargarDocentes()
  }, [])

  async function cargarDocentes() {
    setCargando(true)

    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        employee_code,
        active,
        profiles (
          full_name,
          role,
          active
        )
      `)
      .order('employee_code')

    if (error) {
      console.error('ERROR AL CARGAR DOCENTES:', error)
      alert(`Error al cargar docentes: ${error.message}`)
      setCargando(false)
      return
    }

    setDocentes(data || [])
    setCargando(false)
  }

  async function registrarDocente(e) {
    e.preventDefault()

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setGuardando(true)

    const { data, error } = await supabase.functions.invoke(
      'smooth-service',
      {
        body: {
          full_name: nombre,
          employee_code: codigo,
          email: email,
          password: password,
        },
      }
    )

    if (error) {
      console.error('ERROR AL REGISTRAR DOCENTE:', error)
      alert(`Error al registrar docente: ${error.message}`)
      setGuardando(false)
      return
    }

    if (data?.error) {
      alert(data.error)
      setGuardando(false)
      return
    }

    alert('Docente registrado correctamente.')

    setNombre('')
    setCodigo('')
    setEmail('')
    setPassword('')
    setMostrarFormulario(false)

    await cargarDocentes()

    setGuardando(false)
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Docentes</h1>
          <p>Gestión de docentes y asignaciones</p>
        </div>
      </header>

      <section className="dashboard-content">
        <h2>Docentes registrados</h2>

        {!mostrarFormulario && (
          <button
            className="login-button"
            type="button"
            onClick={() => setMostrarFormulario(true)}
            style={{ marginBottom: '20px' }}
          >
            + Registrar docente
          </button>
        )}

        {mostrarFormulario && (
          <form
            onSubmit={registrarDocente}
            style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              marginBottom: '25px',
            }}
          >
            <h3>Registrar docente</h3>

            <div className="form-group">
              <label htmlFor="nombre">
                Nombres y apellidos
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ejemplo: Juan Pérez García"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="codigo">
                Código de empleado
              </label>

              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ejemplo: DOC001"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="docente@colegio.edu.pe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Contraseña inicial
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            <button
              className="login-button"
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Registrando...'
                : 'Registrar docente'}
            </button>

            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              disabled={guardando}
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

        {cargando ? (
          <p>Cargando docentes...</p>
        ) : docentes.length === 0 ? (
          <div
            style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px' }}>👨‍🏫</div>

            <h3>No hay docentes registrados</h3>

            <p>
              Aquí aparecerán los docentes que sean registrados
              en el sistema.
            </p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {docentes.map((docente) => (
              <div
                className="dashboard-card"
                key={docente.id}
              >
                <div className="card-icon">👨‍🏫</div>

                <h3>
                  {docente.profiles?.full_name || 'Sin nombre'}
                </h3>

                <p>
                  Código:{' '}
                  {docente.employee_code || 'Sin código'}
                </p>

                <p>
                  Estado:{' '}
                  {docente.active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Teachers