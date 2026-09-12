import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { supabase } from './lib/supabase'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLibrary from './pages/admin/AdminLibrary'
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

import StudentDashboard from './pages/student/StudentDashboard'
import StudentAgenda from './pages/student/StudentAgenda'
import StudentLibrary from './pages/student/StudentLibrary'
import StudentReader from './pages/student/StudentReader'
import StudentCertificate from './pages/student/StudentCertificate'
import StudentAchievements from './pages/student/StudentAchievements'
import StudentCertificates from './pages/student/StudentCertificates'
import StudentCertificateVerification from './pages/student/StudentCertificateVerification'

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
      console.error(
        'ERROR AL CARGAR PERFIL:',
        error
      )

      alert(
        `Error al cargar perfil: ${error.message}`
      )

      return
    }

    setProfile(data)
  }

  async function iniciarSesion(e) {
    e.preventDefault()

    const identificador =
      e.target.email.value.trim()

    const password =
      e.target.password.value

    setLoading(true)

    let email = identificador

    const esCodigoEstudiante =
      /^\d+$/.test(identificador)

    if (esCodigoEstudiante) {
      email =
        `${identificador}@students.agendaescolar.local`
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      console.error(
        'ERROR SUPABASE:',
        error
      )

      alert(
        'No se pudo iniciar sesión. Verifica tu código/correo y contraseña.'
      )

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

            <div className="logo">
              AE
            </div>

            <h1>
              Agenda Escolar
            </h1>

            <p>
              Cargando...
            </p>

          </div>

        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <BrowserRouter>

        <Routes>

          <Route
            path="/verificar-certificado/:certificateCode"
            element={
              <StudentCertificateVerification />
            }
          />

          <Route
            path="*"
            element={
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
                      Sistema de control de revisión de agendas
                    </p>

                  </div>

                  <form
                    className="login-form"
                    onSubmit={iniciarSesion}
                  >

                    <div className="form-group">

                      <label htmlFor="email">
                        Correo electrónico o código de estudiante
                      </label>

                      <input
                        id="email"
                        name="email"
                        type="text"
                        placeholder="Ingrese su correo o código"
                        autoComplete="username"
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
                        autoComplete="current-password"
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

                    <span>
                      Agenda Escolar
                    </span>

                    <span>
                      •
                    </span>

                    <span>
                      2026
                    </span>

                  </div>

                </section>

              </main>
            }
          />

        </Routes>

      </BrowserRouter>
    )
  }

  if (!profile) {
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

  /*
   * ============================
   * ADMINISTRADOR
   * ============================
   */

  if (profile.role === 'admin') {
    return (
      <BrowserRouter>

        <Routes>

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
            path="/admin/biblioteca"
            element={<AdminLibrary />}
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
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>
    )
  }

  /*
   * ============================
   * ESTUDIANTE
   * ============================
   */

  if (profile.role === 'student') {
    return (
      <BrowserRouter>

        <Routes>

          <Route
            path="/"
            element={
              <StudentDashboard
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante"
            element={
              <StudentDashboard
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/agenda"
            element={
              <StudentAgenda
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/biblioteca"
            element={
              <StudentLibrary
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/biblioteca/libro/:bookId"
            element={
              <StudentReader
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/logros"
            element={
              <StudentAchievements
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/certificados"
            element={
              <StudentCertificates
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/estudiante/biblioteca/certificado/:certificateId"
            element={
              <StudentCertificate />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>
    )
  }

  /*
   * ============================
   * TUTOR
   * ============================
   */

  if (profile.role === 'tutor') {
    return (
      <BrowserRouter>

        <Routes>

          <Route
            path="/"
            element={
              <TutorDashboard
                profile={profile}
                cerrarSesion={cerrarSesion}
              />
            }
          />

          <Route
            path="/tutor/seccion/:sectionId"
            element={<TutorSection />}
          />

          <Route
            path="/tutor/seccion/:sectionId/revisiones"
            element={<AgendaReviews />}
          />

          <Route
            path="/tutor/seccion/:sectionId/ranking"
            element={<Ranking />}
          />

          <Route
            path="/tutor/seccion/:sectionId/incentivos"
            element={<Incentives />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>
    )
  }

  /*
   * ============================
   * ROL NO RECONOCIDO
   * ============================
   */

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
            El rol de este usuario no está configurado.
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

export default App