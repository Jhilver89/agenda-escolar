import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './StudentAchievements.css'

function StudentAchievements({
  profile,
  cerrarSesion,
}) {
  const navigate = useNavigate()

  const [logros, setLogros] = useState([])
  const [logrosObtenidos, setLogrosObtenidos] =
    useState(new Map())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarLogros()
  }, [profile?.id])

  async function cargarLogros() {
    if (!profile?.id) {
      return
    }

    try {
      setLoading(true)
      setError('')

      /*
       * Primero evaluamos los logros.
       * La función SQL identifica al estudiante mediante auth.uid().
       */
      const {
        error: evaluarError,
      } = await supabase.rpc(
        'evaluate_my_library_achievements'
      )

      if (evaluarError) {
        console.error(
          'ERROR AL EVALUAR LOGROS:',
          evaluarError
        )
      }

      /*
       * Cargar las definiciones activas.
       */
      const {
        data: definiciones,
        error: definicionesError,
      } = await supabase
        .from('library_achievement_definitions')
        .select(`
          id,
          code,
          name,
          description,
          icon,
          category,
          requirement_type,
          requirement_value,
          sort_order
        `)
        .eq('active', true)
        .order('sort_order', {
          ascending: true,
        })

      if (definicionesError) {
        console.error(
          'ERROR AL CARGAR DEFINICIONES DE LOGROS:',
          definicionesError
        )

        setError(
          'No se pudieron cargar los logros.'
        )

        return
      }

      /*
       * Buscar al estudiante vinculado al perfil.
       */
      const {
        data: student,
        error: studentError,
      } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('active', true)
        .single()

      if (studentError) {
        console.error(
          'ERROR AL CARGAR ESTUDIANTE:',
          studentError
        )

        setError(
          'No se pudo identificar al estudiante.'
        )

        return
      }

      /*
       * Cargar los logros obtenidos por ese estudiante.
       */
      const {
        data: obtenidos,
        error: obtenidosError,
      } = await supabase
        .from('library_student_achievements')
        .select(`
          achievement_id,
          earned_at
        `)
        .eq('student_id', student.id)

      if (obtenidosError) {
        console.error(
          'ERROR AL CARGAR LOGROS OBTENIDOS:',
          obtenidosError
        )

        setError(
          'No se pudieron cargar tus logros obtenidos.'
        )

        return
      }

      const mapa = new Map()

      ;(obtenidos || []).forEach((logro) => {
        mapa.set(
          logro.achievement_id,
          logro.earned_at
        )
      })

      setLogros(definiciones || [])
      setLogrosObtenidos(mapa)
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL CARGAR LOGROS:',
        err
      )

      setError(
        'Ocurrió un error al cargar tus logros.'
      )
    } finally {
      setLoading(false)
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return ''
    }

    const fechaObjeto = new Date(fecha)

    if (Number.isNaN(fechaObjeto.getTime())) {
      return ''
    }

    return fechaObjeto.toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  function obtenerTextoRequisito(logro) {
    const valor = Number(
      logro.requirement_value
    )

    if (
      logro.requirement_type ===
      'books_completed'
    ) {
      return `${valor} ${
        valor === 1
          ? 'libro completado'
          : 'libros completados'
      }`
    }

    if (
      logro.requirement_type ===
      'pages_read'
    ) {
      return `${valor} ${
        valor === 1
          ? 'página leída'
          : 'páginas leídas'
      }`
    }

    if (
      logro.requirement_type ===
      'reading_seconds'
    ) {
      const horas = Math.floor(
        valor / 3600
      )

      const minutos = Math.floor(
        (valor % 3600) / 60
      )

      if (horas > 0) {
        return `${horas} ${
          horas === 1
            ? 'hora'
            : 'horas'
        } de lectura`
      }

      return `${minutos} ${
        minutos === 1
          ? 'minuto'
          : 'minutos'
      } de lectura`
    }

    return 'Requisito de lectura'
  }

  if (loading) {
    return (
      <main className="student-achievements-page">
        <header className="student-achievements-header">
          <div>
            <button
              type="button"
              className="student-achievements-back"
              onClick={() =>
                navigate('/estudiante')
              }
            >
              ← Portal
            </button>

            <div className="student-achievements-title">
              <span>🏆</span>

              <div>
                <p>
                  BIBLIOTECA DIGITAL
                </p>

                <h1>
                  Mis logros
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="student-achievements-logout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="student-achievements-content">
          <div className="student-achievements-loading">
            <div className="student-achievements-loading-icon">
              🏆
            </div>

            <h2>
              Cargando tus logros...
            </h2>

            <p>
              Estamos revisando tus avances de lectura.
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="student-achievements-page">
        <header className="student-achievements-header">
          <div>
            <button
              type="button"
              className="student-achievements-back"
              onClick={() =>
                navigate('/estudiante')
              }
            >
              ← Portal
            </button>

            <div className="student-achievements-title">
              <span>🏆</span>

              <div>
                <p>
                  BIBLIOTECA DIGITAL
                </p>

                <h1>
                  Mis logros
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="student-achievements-logout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <section className="student-achievements-content">
          <div className="student-achievements-error">
            <div>
              ⚠
            </div>

            <h2>
              No se pudieron cargar tus logros
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={cargarLogros}
            >
              Intentar nuevamente
            </button>
          </div>
        </section>
      </main>
    )
  }

  const cantidadObtenidos =
    logros.filter((logro) =>
      logrosObtenidos.has(logro.id)
    ).length

  return (
    <main className="student-achievements-page">
      <header className="student-achievements-header">
        <div>
          <button
            type="button"
            className="student-achievements-back"
            onClick={() =>
              navigate('/estudiante')
            }
          >
            ← Portal
          </button>

          <div className="student-achievements-title">
            <span>🏆</span>

            <div>
              <p>
                BIBLIOTECA DIGITAL
              </p>

              <h1>
                Mis logros
              </h1>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="student-achievements-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="student-achievements-content">
        <div className="student-achievements-summary">
          <div>
            <p className="student-achievements-label">
              MI PROGRESO
            </p>

            <h2>
              Tus reconocimientos de lectura
            </h2>

            <p>
              Completa libros y acumula páginas y
              tiempo de lectura para desbloquear
              nuevos logros.
            </p>
          </div>

          <div className="student-achievements-counter">
            <strong>
              {cantidadObtenidos}
            </strong>

            <span>
              de {logros.length} logros
            </span>
          </div>
        </div>

        {logros.length === 0 ? (
          <div className="student-achievements-empty">
            <div>
              🏆
            </div>

            <h2>
              Todavía no hay logros configurados
            </h2>

            <p>
              Cuando se agreguen logros aparecerán
              aquí.
            </p>
          </div>
        ) : (
          <section className="student-achievements-grid">
            {logros.map((logro) => {
              const earned =
                logrosObtenidos.has(
                  logro.id
                )

              const earnedAt =
                logrosObtenidos.get(
                  logro.id
                )

              return (
                <article
                  key={logro.id}
                  className={
                    `student-achievement-card ${
                      earned
                        ? 'earned'
                        : 'locked'
                    }`
                  }
                >
                  <div className="student-achievement-icon">
                    {logro.icon || '🏆'}
                  </div>

                  <div className="student-achievement-body">
                    <div className="student-achievement-status">
                      {earned
                        ? 'LOGRO OBTENIDO'
                        : 'POR CONSEGUIR'}
                    </div>

                    <h3>
                      {logro.name}
                    </h3>

                    <p>
                      {logro.description}
                    </p>

                    <div className="student-achievement-requirement">
                      {obtenerTextoRequisito(
                        logro
                      )}
                    </div>

                    {earned && earnedAt && (
                      <div className="student-achievement-earned-date">
                        Conseguido el{' '}
                        {formatearFecha(
                          earnedAt
                        )}
                      </div>
                    )}
                  </div>

                  <div className="student-achievement-check">
                    {earned ? '✓' : '🔒'}
                  </div>
                </article>
              )
            })}
          </section>
        )}

        <div className="student-achievements-footer-actions">
          <button
            type="button"
            className="student-achievements-library-button"
            onClick={() =>
              navigate('/estudiante/biblioteca')
            }
          >
            ← Volver a la biblioteca
          </button>
        </div>
      </section>
    </main>
  )
}

export default StudentAchievements
