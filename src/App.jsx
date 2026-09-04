import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { supabase } from './lib/supabase'

import AdminDashboard from './pages/admin/AdminDashboard'
import GradesSections from './pages/admin/GradesSections'
import Teachers from './pages/admin/Teachers'
import TeacherAssignments from './pages/admin/TeacherAssignments'
import Students from './pages/admin/Students'
import Periods from './pages/admin/Periods'
import ReviewDays from './pages/admin/ReviewDays'
import AgendaReviews from './pages/admin/AgendaReviews'
import Ranking from './pages/admin/Ranking'
import Incentives from './pages/admin/Incentives'

import TutorDashboard from './pages/tutor/TutorDashboard'
import TutorSection from './pages/tutor/TutorSection'

import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    comprobarSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)

        if (session) {
          await cargarPerfil(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function comprobarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setSession(session)

    if (session) {
      await cargarPerfil(session.user.id)
    }

    setLoading(false)
  }

  async function cargarPerfil(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, active')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('ERROR AL CARGAR PERFIL:', error)
      alert(`Error al cargar perfil: ${error.message}`)
      return
    }

    setProfile(data)
  }

  async function iniciarSesion(e) {
    e.preventDefault()

    const email = e.target.email.value
    const password = e.target.password.value

    setLoading(true)

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      console.error('ERROR SUPABASE:', error)
      alert(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  if (loading) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-header">
            <div className="logo">AE</div>

            <h1>Agenda Escolar</h1>

            <p>Cargando...</p>
          </div>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="login-page">
        <section className="login-card">

          <div className="login-header">
            <div className="logo">AE</div>

            <h1>Agenda Escolar</h1>

            <p>
              Sistema de control de revisión de agendas
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={iniciarSesion}
          >

            <div className="form-group">
              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Ingrese su correo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Ingrese su contraseña"
                required
              />
            </div>

            <button
              className="login-button"
              type="submit"
            >
              Iniciar sesión
            </button>

          </form>

          <div className="login-footer">
            <span>Agenda Escolar</span>
            <span>•</span>
            <span>2026</span>
          </div>

        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="login-page">
        <section className="login-card">

          <div className="login-header">
            <div className="logo">AE</div>

            <h1>Agenda Escolar</h1>

            <p>
              No se encontró el perfil del usuario.
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
    <BrowserRouter>

      {profile.role === 'admin' ? (

        <Routes>

          {/* ADMINISTRADOR */}

          <Route
            path="/"
            element={
              <AdminDashboard
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/admin/docentes"
            element={<Teachers />}
          />

          <Route
            path="/admin/grados-secciones"
            element={<GradesSections />}
          />

          <Route
            path="/admin/asignaciones"
            element={<TeacherAssignments />}
          />

          <Route
            path="/admin/estudiantes"
            element={<Students />}
          />

          <Route
            path="/admin/periodos"
            element={<Periods />}
          />

          <Route
            path="/admin/dias-revision"
            element={<ReviewDays />}
          />

          <Route
            path="/admin/revisiones"
            element={<AgendaReviews />}
          />

          <Route
            path="/admin/ranking"
            element={<Ranking />}
          />

          <Route
            path="/admin/incentivos"
            element={<Incentives />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>

      ) : (

        <Routes>

          {/* TUTOR */}

          <Route
            path="/"
            element={
              <TutorDashboard
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          {/* SECCIÓN DEL TUTOR */}

          <Route
            path="/tutor/seccion/:sectionId"
            element={<TutorSection />}
          />

          {/* REVISAR AGENDAS */}

          <Route
            path="/tutor/seccion/:sectionId/revisiones"
            element={<AgendaReviews />}
          />

          {/* RANKING */}

          <Route
            path="/tutor/seccion/:sectionId/ranking"
            element={<Ranking />}
          />

          {/* INCENTIVOS */}

          <Route
            path="/tutor/seccion/:sectionId/incentivos"
            element={<Incentives />}
          />

          {/* RUTA DESCONOCIDA */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>

      )}

    </BrowserRouter>
  )
}

export default App