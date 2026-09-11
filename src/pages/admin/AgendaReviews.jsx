import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabase'

function AgendaReviews() {
  const [periods, setPeriods] = useState([])
  const [grades, setGrades] = useState([])
  const [sections, setSections] = useState([])
  const [reviewDays, setReviewDays] = useState([])
  const [students, setStudents] = useState([])
  const [reviews, setReviews] = useState([])

  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedDay, setSelectedDay] = useState('')

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
          level_id,
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

  /*
   * Cuando cambia el período o grado,
   * cargamos las secciones correspondientes.
   */
  useEffect(() => {
    setSelectedSection('')
    setSelectedDay('')
    setSections([])
    setReviewDays([])
    setStudents([])
    setReviews([])

    if (!selectedPeriod || !selectedGrade) {
      return
    }

    cargarSecciones()
  }, [selectedPeriod, selectedGrade])

  async function cargarSecciones() {
    const period = periods.find(
      (item) => item.id === selectedPeriod
    )

    if (!period) return

    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('grade_id', selectedGrade)
      .eq('academic_year', period.year)
      .eq('active', true)
      .order('name')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar las secciones.')
      return
    }

    setSections(data || [])
  }

  /*
   * Cuando cambia la sección:
   * - cargamos todos los días configurados
   * - cargamos los estudiantes
   */
  useEffect(() => {
    setSelectedDay('')
    setReviewDays([])
    setStudents([])
    setReviews([])

    if (!selectedPeriod || !selectedSection) {
      return
    }

    cargarDiasRevision()
    cargarEstudiantes()
  }, [selectedPeriod, selectedSection])

  async function cargarDiasRevision() {
    const { data, error } = await supabase
      .from('review_days')
      .select('*')
      .eq('period_id', selectedPeriod)
      .eq('section_id', selectedSection)
      .order('review_date')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar los días de revisión.')
      return
    }

    setReviewDays(data || [])
  }

  async function cargarEstudiantes() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('section_id', selectedSection)
      .eq('active', true)
      .order('full_name')

    if (error) {
      console.error(error)
      setError('No se pudieron cargar los estudiantes.')
      return
    }

    setStudents(data || [])
  }

  /*
   * Cuando se selecciona un día,
   * cargamos las revisiones de ese día.
   */
  useEffect(() => {
    setReviews([])

    if (!selectedDay) {
      return
    }

    cargarRevisiones()
  }, [selectedDay])

  async function cargarRevisiones() {
    const { data, error } = await supabase
      .from('agenda_reviews')
      .select('*')
      .eq('review_day_id', selectedDay)

    if (error) {
      console.error(error)
      setError('No se pudieron cargar las revisiones.')
      return
    }

    setReviews(data || [])
  }

  function obtenerRevision(studentId) {
    return reviews.find(
      (review) => review.student_id === studentId
    )
  }

  /*
   * Guarda o actualiza el estado de la agenda.
   */
  async function guardarRevision(studentId, status) {
    if (!selectedDay) {
      alert('Primero selecciona un día de revisión.')
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('No se encontró el usuario actual.')
      setLoading(false)
      return
    }

    const revisionExistente = obtenerRevision(studentId)

    if (revisionExistente) {
      const { data, error } = await supabase
        .from('agenda_reviews')
        .update({
          status,
          reviewed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', revisionExistente.id)
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('No se pudo actualizar la revisión.')
        setLoading(false)
        return
      }

      setReviews((actuales) =>
        actuales.map((item) =>
          item.id === data.id ? data : item
        )
      )
    } else {
      const { data, error } = await supabase
        .from('agenda_reviews')
        .insert({
          review_day_id: selectedDay,
          student_id: studentId,
          status,
          observation: null,
          reviewed_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('No se pudo guardar la revisión.')
        setLoading(false)
        return
      }

      setReviews((actuales) => [
        ...actuales,
        data,
      ])
    }

    setLoading(false)
  }

  /*
   * Guarda la observación automáticamente
   * cuando el usuario sale del campo.
   */
  async function guardarObservacion(
    studentId,
    observation
  ) {
    const revisionExistente =
      obtenerRevision(studentId)

    if (!revisionExistente) {
      alert('Primero registra el estado de la agenda.')
      return
    }

    const { data, error } = await supabase
      .from('agenda_reviews')
      .update({
        observation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', revisionExistente.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('No se pudo guardar la observación.')
      return
    }

    setReviews((actuales) =>
      actuales.map((item) =>
        item.id === data.id ? data : item
      )
    )
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

  function formatearFechaCompleta(fecha) {
    const date = new Date(`${fecha}T00:00:00`)

    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatearMes(fecha) {
    return fecha.toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric',
    })
  }

  function descargarReportePDF() {
    if (!diaSeleccionado) {
      alert('Primero selecciona un día de revisión.')
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const margen = 15
    const anchoPagina = 210
    const anchoContenido = anchoPagina - margen * 2

    const fecha = formatearFechaCompleta(diaSeleccionado.review_date)
    const firmadas = totalFirmadas
    const noPresentaron = totalNoPresentaron
    const sinFirma = reviews.filter((review) => review.status === 'no_signature').length
    const otros = reviews.filter((review) => review.status === 'other').length
    const porcentaje = totalEstudiantes > 0
      ? Math.round((firmadas / totalEstudiantes) * 100)
      : 0

    const estadoTexto = (status) => {
      if (status === 'signed') return 'FIRMADA'
      if (status === 'not_present') return 'NO PRESENTÓ'
      if (status === 'no_signature') return 'SIN FIRMA'
      if (status === 'other') return 'OTRO'
      return 'PENDIENTE'
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('COLEGIO VANCOUVER', anchoPagina / 2, 18, { align: 'center' })

    doc.setFontSize(12)
    doc.text('REPORTE DE REVISIÓN DE AGENDAS', anchoPagina / 2, 26, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Grado: ${gradoSeleccionado?.name || '-'}`, margen, 38)
    doc.text(`Sección: ${seccionSeleccionada?.name || '-'}`, margen, 44)
    doc.text(`Período: ${periodoSeleccionado?.name || '-'} - ${periodoSeleccionado?.year || '-'}`, margen, 50)
    doc.text(`Fecha: ${fecha}`, margen, 56)

    const statsY = 64
    const statWidth = anchoContenido / 4
    const stats = [
      ['ESTUDIANTES', totalEstudiantes],
      ['FIRMADAS', firmadas],
      ['NO PRESENTÓ', noPresentaron],
      ['CUMPLIMIENTO', `${porcentaje}%`],
    ]

    stats.forEach(([label, value], index) => {
      const x = margen + index * statWidth
      doc.setDrawColor(210, 210, 210)
      doc.rect(x, statsY, statWidth - 2, 18)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(String(label), x + 3, statsY + 6)
      doc.setFontSize(12)
      doc.text(String(value), x + 3, statsY + 13)
    })

    let y = 91
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('DETALLE DE ESTUDIANTES', margen, y)
    y += 6

    const columnas = {
      numero: margen,
      estudiante: margen + 10,
      estado: margen + 100,
      observacion: margen + 135,
    }

    doc.setFillColor(235, 235, 235)
    doc.rect(margen, y - 4, anchoContenido, 9, 'F')
    doc.setFontSize(8)
    doc.text('N.º', columnas.numero + 2, y + 1)
    doc.text('ESTUDIANTE', columnas.estudiante, y + 1)
    doc.text('ESTADO', columnas.estado, y + 1)
    doc.text('OBSERVACIÓN', columnas.observacion, y + 1)
    y += 10

    students.forEach((student, index) => {
      const revision = obtenerRevision(student.id)
      const estado = estadoTexto(revision?.status)
      const observacion = revision?.observation || '-'
      const nombre = student.full_name || '-'
      const nombreLineas = doc.splitTextToSize(nombre, 84)
      const obsLineas = doc.splitTextToSize(observacion, 55)
      const lineas = Math.max(nombreLineas.length, obsLineas.length, 1)
      const alto = Math.max(7, lineas * 4 + 3)

      if (y + alto > 275) {
        doc.addPage()
        y = 18
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('DETALLE DE ESTUDIANTES (CONTINUACIÓN)', margen, y)
        y += 7
      }

      doc.setDrawColor(225, 225, 225)
      doc.rect(margen, y - 4, anchoContenido, alto)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(String(index + 1), columnas.numero + 2, y + 1)
      doc.text(nombreLineas, columnas.estudiante, y + 1)
      doc.text(estado, columnas.estado, y + 1)
      doc.text(obsLineas, columnas.observacion, y + 1)
      y += alto
    })

    y += 8
    if (y > 260) {
      doc.addPage()
      y = 25
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('RESUMEN', margen, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Firmadas: ${firmadas}`, margen, y)
    doc.text(`No presentaron: ${noPresentaron}`, margen + 45, y)
    doc.text(`Sin firma: ${sinFirma}`, margen + 100, y)
    y += 5
    doc.text(`Otros: ${otros}`, margen, y)
    doc.text(`Pendientes: ${totalPendientes}`, margen + 45, y)

    y += 24
    if (y > 275) {
      doc.addPage()
      y = 35
    }

    doc.setDrawColor(100, 100, 100)
    doc.line(65, y, 145, y)
    doc.setFontSize(9)
    doc.text('Firma del tutor', 105, y + 5, { align: 'center' })

    doc.setFontSize(7)
    doc.text('Reporte generado desde Agenda Escolar', anchoPagina / 2, 290, { align: 'center' })

    const nombreArchivo = `Reporte_Agendas_${(gradoSeleccionado?.name || 'grado').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_')}_${(seccionSeleccionada?.name || 'seccion').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_')}_${diaSeleccionado.review_date}.pdf`
    doc.save(nombreArchivo)
  }

  /*
   * Convierte una fecha YYYY-MM-DD
   * a objeto Date local.
   */
  function fechaLocal(fecha) {
    return new Date(`${fecha}T00:00:00`)
  }

  /*
   * Genera todas las fechas del período.
   */
  const fechasPeriodo = useMemo(() => {
    const periodo = periods.find(
      (item) => item.id === selectedPeriod
    )

    if (
      !periodo ||
      !periodo.start_date ||
      !periodo.end_date
    ) {
      return []
    }

    const inicio = fechaLocal(periodo.start_date)
    const fin = fechaLocal(periodo.end_date)

    const fechas = []

    const actual = new Date(inicio)

    while (actual <= fin) {
      const año = actual.getFullYear()
      const mes = String(
        actual.getMonth() + 1
      ).padStart(2, '0')
      const dia = String(
        actual.getDate()
      ).padStart(2, '0')

      fechas.push({
        fecha: `${año}-${mes}-${dia}`,
        dia: actual.getDate(),
        diaSemana: actual.getDay(),
      })

      actual.setDate(actual.getDate() + 1)
    }

    return fechas
  }, [selectedPeriod, periods])

  /*
   * Para el calendario usamos el primer día del período.
   */
  const calendario = useMemo(() => {
    if (fechasPeriodo.length === 0) {
      return {
        espacios: [],
        semanas: [],
      }
    }

    const primeraFecha =
      fechaLocal(fechasPeriodo[0].fecha)

    const primerDiaSemana =
      primeraFecha.getDay()

    const espacios = Array.from(
      { length: primerDiaSemana },
      (_, index) => `vacio-${index}`
    )

    const elementos = [
      ...espacios,
      ...fechasPeriodo,
    ]

    const semanas = []

    for (
      let i = 0;
      i < elementos.length;
      i += 7
    ) {
      semanas.push(
        elementos.slice(i, i + 7)
      )
    }

    return {
      espacios,
      semanas,
    }
  }, [fechasPeriodo])

  function obtenerRegistroDia(fecha) {
    return reviewDays.find(
      (day) => day.review_date === fecha
    )
  }

  /*
   * Un día sin registro se considera disponible
   * si es lunes a viernes.
   *
   * Sábado y domingo no corresponden
   * por defecto.
   */
  function diaEsValido(dia, registro) {
    if (registro) {
      return registro.is_review_day === true
    }

    const esFinDeSemana =
      dia.diaSemana === 0 ||
      dia.diaSemana === 6

    return !esFinDeSemana
  }

  /*
   * Selecciona un día.
   *
   * Si es un día laboral y todavía no existe
   * en review_days, se crea automáticamente.
   */
  async function seleccionarDia(
    dia,
    registro
  ) {
    const esFinDeSemana =
      dia.diaSemana === 0 ||
      dia.diaSemana === 6

    /*
     * Si existe y está deshabilitado.
     */
    if (
      registro &&
      !registro.is_review_day
    ) {
      alert(
        `Este día no corresponde a una revisión.${
          registro.reason
            ? ` Motivo: ${registro.reason}.`
            : ''
        }`
      )
      return
    }

    /*
     * Si no existe y es fin de semana.
     */
    if (!registro && esFinDeSemana) {
      alert(
        'Este día corresponde a sábado o domingo y no está habilitado para revisión.'
      )
      return
    }

    /*
     * Si ya existe como día válido.
     */
    if (registro && registro.is_review_day) {
      setSelectedDay(registro.id)
      return
    }

    /*
     * Si no existe, lo creamos automáticamente.
     */
    setLoading(true)

    const { data, error } = await supabase
      .from('review_days')
      .insert({
        period_id: selectedPeriod,
        section_id: selectedSection,
        review_date: dia.fecha,
        is_review_day: true,
        reason: null,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert(
        'No se pudo activar este día de revisión.'
      )
      setLoading(false)
      return
    }

    setReviewDays((actuales) => [
      ...actuales,
      data,
    ])

    setSelectedDay(data.id)

    setLoading(false)
  }

  const periodoSeleccionado = periods.find(
    (period) => period.id === selectedPeriod
  )

  const gradoSeleccionado = grades.find(
    (grade) => grade.id === selectedGrade
  )

  const seccionSeleccionada = sections.find(
    (section) => section.id === selectedSection
  )

  const diaSeleccionado = reviewDays.find(
    (day) => day.id === selectedDay
  )

  /*
   * Estadísticas del día.
   */
  const totalEstudiantes = students.length

  const totalFirmadas = reviews.filter(
    (review) => review.status === 'signed'
  ).length

  const totalNoPresentaron = reviews.filter(
    (review) => review.status === 'not_present'
  ).length

  const totalRegistradas = reviews.length

  const totalPendientes =
    totalEstudiantes - totalRegistradas

  return (
    <main className="dashboard agenda-reviews-page">

      <header className="dashboard-header">
        <div>
          <h1>Revisión de agendas</h1>
          <p>
            Registra la presentación y firma de
            las agendas de tus estudiantes.
          </p>
        </div>
      </header>

      <section className="dashboard-content">

        {/* =================================================
            SELECCIÓN
            ================================================= */}

        <div className="agenda-selection-card">

          <div className="agenda-selection-title">

            <div className="agenda-title-icon">
              📋
            </div>

            <div>
              <h2>
                Seleccionar sección
              </h2>

              <p>
                Elige el período, grado y sección
                que deseas revisar.
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

        {/* =================================================
            CALENDARIO
            ================================================= */}

        {periodoSeleccionado &&
          seccionSeleccionada && (

          <div className="agenda-calendar-card">

            <div className="agenda-calendar-header">

              <div>

                <span className="agenda-section-badge">
                  {gradoSeleccionado?.name}
                  {' · '}
                  Sección {seccionSeleccionada.name}
                </span>

                <h2>
                  Calendario de revisiones
                </h2>

                <p>
                  Selecciona el día en que deseas
                  registrar la revisión.
                </p>

              </div>

              <div className="agenda-calendar-legend">

                <span>
                  <i className="calendar-dot calendar-dot-active"></i>
                  Día disponible
                </span>

                <span>
                  <i className="calendar-dot calendar-dot-disabled"></i>
                  No corresponde
                </span>

              </div>

            </div>

            <div className="agenda-calendar">

              <div className="agenda-calendar-month">
                {fechasPeriodo.length > 0
                  ? formatearMes(
                      fechaLocal(
                        fechasPeriodo[0].fecha
                      )
                    )
                  : 'Sin fechas'}
              </div>

              <div className="agenda-weekdays">
                <span>DOM</span>
                <span>LUN</span>
                <span>MAR</span>
                <span>MIÉ</span>
                <span>JUE</span>
                <span>VIE</span>
                <span>SÁB</span>
              </div>

              <div className="agenda-calendar-grid">

                {calendario.semanas.map(
                  (semana, semanaIndex) =>
                    semana.map(
                      (dia, diaIndex) => {

                        if (
                          typeof dia === 'string'
                        ) {
                          return (
                            <div
                              key={dia}
                              className="agenda-calendar-empty"
                            />
                          )
                        }

                        const registro =
                          obtenerRegistroDia(
                            dia.fecha
                          )

                        const esValido =
                          diaEsValido(
                            dia,
                            registro
                          )

                        const esSeleccionado =
                          registro?.id ===
                          selectedDay

                        const esFinDeSemana =
                          dia.diaSemana === 0 ||
                          dia.diaSemana === 6

                        let clase =
                          'agenda-calendar-day'

                        if (esValido) {
                          clase += ' valid'
                        } else {
                          clase += ' disabled'
                        }

                        if (
                          esFinDeSemana
                        ) {
                          clase += ' weekend'
                        }

                        if (
                          esSeleccionado
                        ) {
                          clase += ' selected'
                        }

                        return (
                          <button
                            key={`${semanaIndex}-${diaIndex}`}
                            type="button"
                            className={clase}
                            onClick={() =>
                              seleccionarDia(
                                dia,
                                registro
                              )
                            }
                            disabled={
                              loading
                            }
                            title={
                              esValido
                                ? 'Seleccionar día de revisión'
                                : 'No corresponde a revisión'
                            }
                          >

                            <span className="calendar-day-number">
                              {dia.dia}
                            </span>

                            {esValido ? (
                              <span className="calendar-day-check">
                                ✓
                              </span>
                            ) : (
                              <span className="calendar-day-x">
                                —
                              </span>
                            )}

                          </button>
                        )
                      }
                    )
                )}

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            MENSAJE INICIAL
            ================================================= */}

        {!selectedSection && (
          <div className="agenda-initial-message">

            <div className="agenda-initial-icon">
              📅
            </div>

            <h2>
              Selecciona una sección
            </h2>

            <p>
              Primero selecciona el período,
              grado y sección para visualizar
              el calendario de revisiones.
            </p>

          </div>
        )}

        {/* =================================================
            DÍA SELECCIONADO
            ================================================= */}

        {diaSeleccionado && (

          <div className="agenda-students-section">

            <div className="selected-review-banner">

              <div className="selected-review-icon">
                📋
              </div>

              <div>
                <span>
                  DÍA DE REVISIÓN
                </span>

                <strong>
                  {formatearFechaCompleta(
                    diaSeleccionado.review_date
                  )}
                </strong>
              </div>

              <div className="selected-review-count">

                <span>
                  ESTUDIANTES
                </span>

                <strong>
                  {totalEstudiantes}
                </strong>

              </div>

            </div>

            {/* ESTADÍSTICAS */}

            <div className="agenda-statistics">

              <div className="agenda-stat">

                <div className="agenda-stat-icon total">
                  👥
                </div>

                <div>
                  <strong>
                    {totalEstudiantes}
                  </strong>

                  <span>
                    Total estudiantes
                  </span>
                </div>

              </div>

              <div className="agenda-stat">

                <div className="agenda-stat-icon signed">
                  ✓
                </div>

                <div>
                  <strong>
                    {totalFirmadas}
                  </strong>

                  <span>
                    Firmadas
                  </span>
                </div>

              </div>

              <div className="agenda-stat">

                <div className="agenda-stat-icon absent">
                  ×
                </div>

                <div>
                  <strong>
                    {totalNoPresentaron}
                  </strong>

                  <span>
                    No presentaron
                  </span>
                </div>

              </div>

              <div className="agenda-stat">

                <div className="agenda-stat-icon pending">
                  !
                </div>

                <div>
                  <strong>
                    {totalPendientes}
                  </strong>

                  <span>
                    Pendientes
                  </span>
                </div>

              </div>

            </div>

            {/* ESTUDIANTES */}

            <div className="agenda-students-header">

              <div>

                <h2>
                  Estudiantes
                </h2>

                <p>
                  Registra el estado de la agenda
                  de cada estudiante.
                </p>

              </div>

              <div className="agenda-students-header-actions">
                <div className="agenda-auto-save">
                  Guardado automático
                </div>

                <button
                  type="button"
                  className="agenda-pdf-button"
                  onClick={descargarReportePDF}
                  disabled={loading || students.length === 0}
                >
                  📄 Descargar reporte PDF
                </button>
              </div>

            </div>

            {students.length > 0 ? (

              <div className="agenda-student-grid">

                {students.map((student) => {

                  const revision =
                    obtenerRevision(
                      student.id
                    )

                  return (

                    <div
                      className={`agenda-student-card ${
                        revision?.status === 'signed'
                          ? 'student-signed'
                          : ''
                      }`}
                      key={student.id}
                    >

                      <div className="agenda-student-top">

                        <div className="agenda-student-avatar">
                          {obtenerAvatar(
                            student.avatar_key
                          )}
                        </div>

                        <div className="agenda-student-info">

                          <h3>
                            {student.full_name}
                          </h3>

                          <span>
                            Código: {student.student_code}
                          </span>

                        </div>

                        {revision?.status ===
                          'signed' && (

                          <div className="agenda-signed-badge">
                            ✓
                          </div>

                        )}

                      </div>

                      <div className="agenda-status-label">
                        Estado de la agenda
                      </div>

                      <div className="agenda-status-buttons">

                        <button
                          type="button"
                          disabled={loading}
                          className={
                            revision?.status ===
                            'signed'
                              ? 'status-signed active'
                              : 'status-signed'
                          }
                          onClick={() =>
                            guardarRevision(
                              student.id,
                              'signed'
                            )
                          }
                        >
                          <span>✓</span>
                          Firmada
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          className={
                            revision?.status ===
                            'not_present'
                              ? 'status-absent active'
                              : 'status-absent'
                          }
                          onClick={() =>
                            guardarRevision(
                              student.id,
                              'not_present'
                            )
                          }
                        >
                          <span>×</span>
                          No presentó
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          className={
                            revision?.status ===
                            'no_signature'
                              ? 'status-nosign active'
                              : 'status-nosign'
                          }
                          onClick={() =>
                            guardarRevision(
                              student.id,
                              'no_signature'
                            )
                          }
                        >
                          <span>✎</span>
                          Sin firma
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          className={
                            revision?.status ===
                            'other'
                              ? 'status-other active'
                              : 'status-other'
                          }
                          onClick={() =>
                            guardarRevision(
                              student.id,
                              'other'
                            )
                          }
                        >
                          <span>•••</span>
                          Otro
                        </button>

                      </div>

                      {revision && (

                        <div className="agenda-observation">

                          <label>
                            Observación
                          </label>

                          <textarea
                            key={revision.id}
                            placeholder="Escribe una observación..."
                            defaultValue={
                              revision.observation ||
                              ''
                            }
                            onBlur={(e) =>
                              guardarObservacion(
                                student.id,
                                e.target.value
                              )
                            }
                          />

                        </div>

                      )}

                      {revision?.status ===
                        'signed' && (

                        <div className="agenda-point">

                          <span>
                            +1
                          </span>

                          <strong>
                            Punto obtenido
                          </strong>

                          <small>
                            Agenda firmada
                          </small>

                        </div>

                      )}

                    </div>

                  )
                })}

              </div>

            ) : (

              <div className="agenda-empty">

                <div>
                  👥
                </div>

                <h3>
                  No hay estudiantes activos
                </h3>

                <p>
                  No existen estudiantes activos
                  registrados en esta sección.
                </p>

              </div>

            )}

          </div>
        )}

      </section>

    </main>
  )
}

export default AgendaReviews