import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function ReviewDays() {
  const navigate = useNavigate()

  const [periods, setPeriods] = useState([])
  const [grades, setGrades] = useState([])
  const [sections, setSections] = useState([])
  const [reviewDays, setReviewDays] = useState([])

  const [periodId, setPeriodId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [sectionId, setSectionId] = useState('')

  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarPeriodos()
    cargarGrados()
  }, [])

  useEffect(() => {
    if (periodId && sectionId) {
      cargarDiasRevision()
    } else {
      setReviewDays([])
    }
  }, [periodId, sectionId])

  useEffect(() => {
    if (gradeId && periodId) {
      cargarSecciones()
    } else {
      setSections([])
      setSectionId('')
    }
  }, [gradeId, periodId])

  async function cargarPeriodos() {
    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error(error)
      setError('No se pudieron cargar los períodos.')
      return
    }

    setPeriods(data || [])
  }

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
      console.error(error)
      setError('No se pudieron cargar los grados.')
      return
    }

    setGrades(data || [])
  }

  async function cargarSecciones() {
    const periodo = periods.find(
      (period) => period.id === periodId
    )

    if (!periodo) return

    const { data, error } = await supabase
      .from('sections')
      .select('id, name, academic_year, grade_id')
      .eq('grade_id', gradeId)
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

  function generarFechas(inicio, fin) {
    const fechas = []

    const fechaInicio = new Date(`${inicio}T00:00:00`)
    const fechaFin = new Date(`${fin}T00:00:00`)

    const actual = new Date(fechaInicio)

    while (actual <= fechaFin) {
      const fecha = actual.toISOString().split('T')[0]

      fechas.push(fecha)

      actual.setDate(actual.getDate() + 1)
    }

    return fechas
  }

  async function cargarDiasRevision() {
    const periodo = periods.find(
      (period) => period.id === periodId
    )

    if (!periodo || !sectionId) return

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('review_days')
      .select('*')
      .eq('period_id', periodId)
      .eq('section_id', sectionId)
      .order('review_date')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar los días de revisión.')
      setLoading(false)
      return
    }

    const registros = data || []

    const fechas = generarFechas(
      periodo.start_date,
      periodo.end_date
    )

    const resultado = fechas.map((fecha) => {
      const existente = registros.find(
        (item) => item.review_date === fecha
      )

      if (existente) {
        return existente
      }

      return {
        id: null,
        period_id: periodId,
        section_id: sectionId,
        review_date: fecha,
        is_review_day: true,
        reason: '',
      }
    })

    setReviewDays(resultado)
    setLoading(false)
  }

  async function cambiarDia(dia) {
    setSavingId(dia.review_date)
    setError('')

    const nuevoEstado = !dia.is_review_day

    if (!dia.id) {
      const { data, error } = await supabase
        .from('review_days')
        .insert({
          period_id: periodId,
          section_id: sectionId,
          review_date: dia.review_date,
          is_review_day: nuevoEstado,
          reason: nuevoEstado ? null : 'No corresponde',
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        setError(error.message)
        setSavingId(null)
        return
      }

      setReviewDays((prev) =>
        prev.map((item) =>
          item.review_date === dia.review_date
            ? data
            : item
        )
      )
    } else {
      const { data, error } = await supabase
        .from('review_days')
        .update({
          is_review_day: nuevoEstado,
          reason: nuevoEstado ? null : 'No corresponde',
        })
        .eq('id', dia.id)
        .select()
        .single()

      if (error) {
        console.error(error)
        setError(error.message)
        setSavingId(null)
        return
      }

      setReviewDays((prev) =>
        prev.map((item) =>
          item.id === dia.id
            ? data
            : item
        )
      )
    }

    setSavingId(null)
  }

  async function cambiarMotivo(dia, motivo) {
    if (!dia.id) {
      const { data, error } = await supabase
        .from('review_days')
        .insert({
          period_id: periodId,
          section_id: sectionId,
          review_date: dia.review_date,
          is_review_day: false,
          reason: motivo,
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        setError(error.message)
        return
      }

      setReviewDays((prev) =>
        prev.map((item) =>
          item.review_date === dia.review_date
            ? data
            : item
        )
      )

      return
    }

    const { data, error } = await supabase
      .from('review_days')
      .update({
        reason: motivo,
        is_review_day: false,
      })
      .eq('id', dia.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      setError(error.message)
      return
    }

    setReviewDays((prev) =>
      prev.map((item) =>
        item.id === dia.id
          ? data
          : item
      )
    )
  }

  function formatearFecha(fecha) {
    const [year, month, day] = fecha.split('-')

    return `${day}/${month}/${year}`
  }

  function obtenerDiaSemana(fecha) {
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ]

    const fechaLocal = new Date(`${fecha}T00:00:00`)

    return dias[fechaLocal.getDay()]
  }

  const periodoSeleccionado = periods.find(
    (period) => period.id === periodId
  )

  const seccionSeleccionada = sections.find(
    (section) => section.id === sectionId
  )

  return (
    <main className="review-days-page">
      <header className="review-days-header">
        <div className="review-days-title-wrap">
          <div className="review-days-title-icon">📅</div>
          <div>
            <h1>Días de revisión</h1>
            <p>Configura qué días se contabilizan para la revisión de agendas.</p>
          </div>
        </div>

        <button
          type="button"
          className="review-days-back-button"
          onClick={() => navigate('/')}
        >
          ← Volver
        </button>
      </header>

      <section className="review-days-content">
        <div className="review-days-selection-card">
          <div className="review-days-card-heading">
            <div className="review-days-card-icon">⚙️</div>
            <div>
              <h2>Seleccionar período y sección</h2>
              <p>
                Elige el período, grado y sección que deseas configurar.
              </p>
            </div>
          </div>

          <div className="review-days-selection-grid">
            <div className="review-days-field">
              <label>Período</label>
              <select
                value={periodId}
                onChange={(e) => {
                  setPeriodId(e.target.value)
                  setSectionId('')
                }}
              >
                <option value="">Seleccionar período</option>
                {periods.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    {periodo.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="review-days-field">
              <label>Grado</label>
              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value)
                  setSectionId('')
                }}
              >
                <option value="">Seleccionar grado</option>
                {grades.map((grado) => (
                  <option key={grado.id} value={grado.id}>
                    {grado.educational_levels?.name} - {grado.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="review-days-field">
              <label>Sección</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!gradeId || !periodId}
              >
                <option value="">Seleccionar sección</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Sección {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="review-days-error">
              ⚠️ {error}
            </div>
          )}
        </div>

        {periodoSeleccionado && seccionSeleccionada && (
          <div className="review-days-config-card">
            <div className="review-days-config-header">
              <div>
                <span className="review-days-eyebrow">CONFIGURACIÓN</span>
                <h2>
                  {periodoSeleccionado.name} · Sección{' '}
                  {seccionSeleccionada.name}
                </h2>
                <p>
                  Los días están considerados como días de revisión por defecto.
                  Desactiva únicamente los que no deban contabilizarse.
                </p>
              </div>

              <div className="review-days-legend">
                <div>
                  <span className="legend-dot valid"></span>
                  Día de revisión
                </div>
                <div>
                  <span className="legend-dot invalid"></span>
                  No corresponde
                </div>
              </div>
            </div>

            {loading ? (
              <div className="review-days-loading">
                <div className="review-days-loading-icon">⏳</div>
                <h3>Cargando calendario...</h3>
                <p>Estamos preparando los días del período.</p>
              </div>
            ) : (
              <div className="review-days-calendar">
                <div className="review-days-calendar-head">
                  <div>Lunes</div>
                  <div>Martes</div>
                  <div>Miércoles</div>
                  <div>Jueves</div>
                  <div>Viernes</div>
                  <div>Sábado</div>
                  <div>Domingo</div>
                </div>

                <div className="review-days-calendar-grid">
                  {reviewDays.map((dia) => {
                    const fecha = new Date(`${dia.review_date}T00:00:00`)
                    const diaSemana = fecha.getDay()
                    const esFinDeSemana =
                      diaSemana === 0 || diaSemana === 6
                    const guardando = savingId === dia.review_date

                    return (
                      <div
                        key={dia.review_date}
                        className={`review-day-cell ${
                          dia.is_review_day ? 'valid' : 'invalid'
                        } ${esFinDeSemana ? 'weekend' : ''}`}
                      >
                        <div className="review-day-date">
                          <span>{formatearFecha(dia.review_date)}</span>
                          <strong>
                            {obtenerDiaSemana(dia.review_date).slice(0, 3)}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="review-day-toggle"
                          onClick={() => cambiarDia(dia)}
                          disabled={guardando}
                        >
                          {guardando
                            ? 'Guardando...'
                            : dia.is_review_day
                              ? '✓ Día válido'
                              : '✕ No corresponde'}
                        </button>

                        {dia.is_review_day ? (
                          <div className="review-day-status-text">
                            Se contabiliza
                          </div>
                        ) : (
                          <div className="review-day-reason">
                            <label>Motivo</label>
                            <select
                              value={dia.reason || ''}
                              onChange={(e) =>
                                cambiarMotivo(dia, e.target.value)
                              }
                            >
                              <option value="">Seleccionar motivo</option>
                              <option value="No hubo clases">
                                No hubo clases
                              </option>
                              <option value="Actividad institucional">
                                Actividad institucional
                              </option>
                              <option value="Feriado">
                                Feriado
                              </option>
                              <option value="Suspensión">
                                Suspensión
                              </option>
                              <option value="Otro">
                                Otro
                              </option>
                              <option value="No corresponde">
                                No corresponde
                              </option>
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default ReviewDays
