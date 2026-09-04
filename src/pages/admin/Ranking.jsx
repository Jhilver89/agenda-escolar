import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Ranking() {
  const [periods, setPeriods] = useState([])
  const [grades, setGrades] = useState([])
  const [sections, setSections] = useState([])

  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  const [students, setStudents] = useState([])
  const [reviewDays, setReviewDays] = useState([])
  const [reviews, setReviews] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  async function cargarDatosIniciales() {
    setError('')

    const { data: periodData, error: periodError } =
      await supabase
        .from('periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

    if (periodError) {
      console.error(periodError)
      setError('No se pudieron cargar los períodos.')
      return
    }

    const { data: gradeData, error: gradeError } =
      await supabase
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

    if (gradeError) {
      console.error(gradeError)
      setError('No se pudieron cargar los grados.')
      return
    }

    setPeriods(periodData || [])
    setGrades(gradeData || [])
  }

  useEffect(() => {
    setSelectedSection('')
    setSections([])
    setStudents([])
    setReviewDays([])
    setReviews([])

    if (!selectedPeriod || !selectedGrade) {
      return
    }

    cargarSecciones()
  }, [selectedPeriod, selectedGrade])

  async function cargarSecciones() {
    const periodo = periods.find(
      (item) => item.id === selectedPeriod
    )

    if (!periodo) return

    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('grade_id', selectedGrade)
      .eq('academic_year', periodo.year)
      .eq('active', true)
      .order('name')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar las secciones.')
      return
    }

    setSections(data || [])
  }

  useEffect(() => {
    setStudents([])
    setReviewDays([])
    setReviews([])

    if (!selectedPeriod || !selectedSection) {
      return
    }

    cargarRanking()
  }, [selectedPeriod, selectedSection])

  async function cargarRanking() {
    setLoading(true)
    setError('')

    const [
      studentsResult,
      daysResult,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('section_id', selectedSection)
        .eq('active', true)
        .order('full_name'),

      supabase
        .from('review_days')
        .select('*')
        .eq('period_id', selectedPeriod)
        .eq('section_id', selectedSection)
        .eq('is_review_day', true)
        .order('review_date'),
    ])

    if (studentsResult.error) {
      console.error(studentsResult.error)
      setError('No se pudieron cargar los estudiantes.')
      setLoading(false)
      return
    }

    if (daysResult.error) {
      console.error(daysResult.error)
      setError('No se pudieron cargar los días de revisión.')
      setLoading(false)
      return
    }

    const estudiantes = studentsResult.data || []
    const dias = daysResult.data || []

    setStudents(estudiantes)
    setReviewDays(dias)

    /*
     * Si no hay días válidos todavía,
     * no necesitamos consultar revisiones.
     */
    if (dias.length === 0) {
      setReviews([])
      setLoading(false)
      return
    }

    const idsDias = dias.map(
      (dia) => dia.id
    )

    const { data: reviewData, error: reviewError } =
      await supabase
        .from('agenda_reviews')
        .select('*')
        .in('review_day_id', idsDias)

    if (reviewError) {
      console.error(reviewError)
      setError('No se pudieron cargar las revisiones.')
      setLoading(false)
      return
    }

    setReviews(reviewData || [])
    setLoading(false)
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

  /*
   * Calculamos el ranking.
   *
   * Solo contamos:
   * - días con is_review_day = true
   * - estado signed = 1 punto
   *
   * Por tanto:
   * porcentaje = puntos / días válidos × 100
   */
  const ranking = useMemo(() => {
    const totalDias = reviewDays.length

    const resultados = students.map(
      (student) => {

        const revisionesAlumno =
          reviews.filter(
            (review) =>
              review.student_id === student.id
          )

        const puntos =
          revisionesAlumno.filter(
            (review) =>
              review.status === 'signed'
          ).length

        const diasRegistrados =
          revisionesAlumno.length

        const pendientes =
          Math.max(
            totalDias - diasRegistrados,
            0
          )

        const porcentaje =
          totalDias > 0
            ? Math.round(
                (puntos / totalDias) * 100
              )
            : 0

        return {
          ...student,
          puntos,
          diasRegistrados,
          pendientes,
          porcentaje,
        }
      }
    )

    resultados.sort((a, b) => {
      if (b.puntos !== a.puntos) {
        return b.puntos - a.puntos
      }

      if (
        b.porcentaje !==
        a.porcentaje
      ) {
        return (
          b.porcentaje -
          a.porcentaje
        )
      }

      return a.full_name.localeCompare(
        b.full_name
      )
    })

    return resultados.map(
      (student, index) => ({
        ...student,
        puesto: index + 1,
      })
    )
  }, [
    students,
    reviewDays,
    reviews,
  ])

  const periodoSeleccionado =
    periods.find(
      (item) =>
        item.id === selectedPeriod
    )

  const gradoSeleccionado =
    grades.find(
      (item) =>
        item.id === selectedGrade
    )

  const seccionSeleccionada =
    sections.find(
      (item) =>
        item.id === selectedSection
    )

  const totalPuntos =
    ranking.reduce(
      (total, student) =>
        total + student.puntos,
      0
    )

  const promedio =
    ranking.length > 0
      ? Math.round(
          ranking.reduce(
            (total, student) =>
              total +
              student.porcentaje,
            0
          ) / ranking.length
        )
      : 0

  const mejorAlumno =
    ranking.length > 0
      ? ranking[0]
      : null

  return (
    <main className="dashboard agenda-reviews-page">

      <header className="dashboard-header">
        <div>
          <h1>
            Ranking de estudiantes
          </h1>

          <p>
            Consulta el cumplimiento de las
            revisiones de agendas por período.
          </p>
        </div>
      </header>

      <section className="dashboard-content">

        {/* SELECCIÓN */}

        <div className="agenda-selection-card">

          <div className="agenda-selection-title">

            <div className="agenda-title-icon">
              🏆
            </div>

            <div>
              <h2>
                Seleccionar sección
              </h2>

              <p>
                Elige el período, grado y sección
                para consultar el ranking.
              </p>
            </div>

          </div>

          <div className="agenda-selection-grid">

            <div className="agenda-field">

              <label>
                Período
              </label>

              <select
                value={selectedPeriod}
                onChange={(e) =>
                  setSelectedPeriod(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Seleccione un período
                </option>

                {periods.map((period) => (
                  <option
                    key={period.id}
                    value={period.id}
                  >
                    {period.name} - {period.year}
                  </option>
                ))}

              </select>

            </div>

            <div className="agenda-field">

              <label>
                Grado
              </label>

              <select
                value={selectedGrade}
                onChange={(e) =>
                  setSelectedGrade(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Seleccione un grado
                </option>

                {grades.map((grade) => (
                  <option
                    key={grade.id}
                    value={grade.id}
                  >
                    {grade.educational_levels?.name}
                    {' - '}
                    {grade.name}
                  </option>
                ))}

              </select>

            </div>

            <div className="agenda-field">

              <label>
                Sección
              </label>

              <select
                value={selectedSection}
                onChange={(e) =>
                  setSelectedSection(
                    e.target.value
                  )
                }
                disabled={!selectedGrade}
              >

                <option value="">
                  Seleccione una sección
                </option>

                {sections.map((section) => (
                  <option
                    key={section.id}
                    value={section.id}
                  >
                    Sección {section.name}
                  </option>
                ))}

              </select>

            </div>

          </div>

          {error && (
            <div className="agenda-error">
              {error}
            </div>
          )}

        </div>

        {/* MENSAJE INICIAL */}

        {!selectedSection && (

          <div className="agenda-initial-message">

            <div className="agenda-initial-icon">
              🏆
            </div>

            <h2>
              Selecciona una sección
            </h2>

            <p>
              Selecciona el período, grado y
              sección para visualizar el ranking.
            </p>

          </div>

        )}

        {/* RESULTADOS */}

        {selectedSection && (

          <>
            <div className="agenda-calendar-card">

              <div className="agenda-calendar-header">

                <div>

                  <span className="agenda-section-badge">
                    {gradoSeleccionado?.name}
                    {' · '}
                    Sección {seccionSeleccionada?.name}
                  </span>

                  <h2>
                    Ranking de agendas
                  </h2>

                  <p>
                    {periodoSeleccionado?.name}
                    {' '}
                    {periodoSeleccionado?.year}
                  </p>

                </div>

              </div>

              {/* ESTADÍSTICAS */}

              <div className="agenda-statistics">

                <div className="agenda-stat">

                  <div className="agenda-stat-icon total">
                    📅
                  </div>

                  <div>
                    <strong>
                      {reviewDays.length}
                    </strong>

                    <span>
                      Días válidos
                    </span>
                  </div>

                </div>

                <div className="agenda-stat">

                  <div className="agenda-stat-icon signed">
                    ✓
                  </div>

                  <div>
                    <strong>
                      {totalPuntos}
                    </strong>

                    <span>
                      Puntos obtenidos
                    </span>
                  </div>

                </div>

                <div className="agenda-stat">

                  <div className="agenda-stat-icon pending">
                    %
                  </div>

                  <div>
                    <strong>
                      {promedio}%
                    </strong>

                    <span>
                      Promedio del aula
                    </span>
                  </div>

                </div>

                <div className="agenda-stat">

                  <div className="agenda-stat-icon signed">
                    🏆
                  </div>

                  <div>
                    <strong>
                      {mejorAlumno
                        ? `#${mejorAlumno.puesto}`
                        : '-'}
                    </strong>

                    <span>
                      Mejor puesto
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* TABLA / RANKING */}

            <div className="agenda-students-section">

              <div className="agenda-students-header">

                <div>
                  <h2>
                    Clasificación
                  </h2>

                  <p>
                    Los estudiantes se ordenan
                    por puntos obtenidos.
                  </p>
                </div>

                <div className="agenda-auto-save">
                  {reviewDays.length}{' '}
                  días evaluados
                </div>

              </div>

              {loading ? (

                <div className="agenda-loading">
                  Cargando ranking...
                </div>

              ) : ranking.length === 0 ? (

                <div className="agenda-empty">

                  <div>
                    👥
                  </div>

                  <h3>
                    No hay estudiantes
                  </h3>

                  <p>
                    No existen estudiantes activos
                    en esta sección.
                  </p>

                </div>

              ) : (

                <div className="ranking-list">

                  {ranking.map((student) => (

                    <div
                      className={`ranking-card ${
                        student.puesto <= 3
                          ? `ranking-top-${student.puesto}`
                          : ''
                      }`}
                      key={student.id}
                    >

                      <div className="ranking-position">

                        {student.puesto === 1 && '🥇'}

                        {student.puesto === 2 && '🥈'}

                        {student.puesto === 3 && '🥉'}

                        {student.puesto > 3 &&
                          `#${student.puesto}`}

                      </div>

                      <div className="agenda-student-avatar">
                        {obtenerAvatar(
                          student.avatar_key
                        )}
                      </div>

                      <div className="ranking-student-info">

                        <h3>
                          {student.full_name}
                        </h3>

                        <span>
                          Código:{' '}
                          {student.student_code}
                        </span>

                      </div>

                      <div className="ranking-progress">

                        <div className="ranking-progress-top">

                          <span>
                            Cumplimiento
                          </span>

                          <strong>
                            {student.porcentaje}%
                          </strong>

                        </div>

                        <div className="ranking-progress-bar">

                          <div
                            style={{
                              width: `${student.porcentaje}%`,
                            }}
                          />

                        </div>

                        <small>
                          {student.puntos}{' '}
                          puntos de{' '}
                          {reviewDays.length}
                        </small>

                      </div>

                      <div className="ranking-points">

                        <strong>
                          {student.puntos}
                        </strong>

                        <span>
                          puntos
                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </>
        )}

      </section>

    </main>
  )
}

export default Ranking