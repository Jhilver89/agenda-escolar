import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function Periods() {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    start_date: '',
    end_date: '',
  })

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  useEffect(() => {
    cargarPeriodos()
  }, [])

  async function cargarPeriodos() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) {
      console.error(error)
      setError('No se pudieron cargar los períodos.')
    } else {
      setPeriods(data || [])
    }

    setLoading(false)
  }

  function cambiarCampo(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function registrarPeriodo(e) {
    e.preventDefault()
    setError('')

    if (!form.start_date || !form.end_date) {
      setError(
        'Debes ingresar la fecha de inicio y la fecha de fin.'
      )
      return
    }

    if (form.end_date < form.start_date) {
      setError(
        'La fecha de fin no puede ser anterior a la fecha de inicio.'
      )
      return
    }

    setSaving(true)

    const nombre = `${meses[Number(form.month) - 1]} ${form.year}`

    const { error } = await supabase
      .from('periods')
      .insert({
        name: nombre,
        year: Number(form.year),
        month: Number(form.month),
        start_date: form.start_date,
        end_date: form.end_date,
        closed: false,
      })

    if (error) {
      console.error(error)

      if (error.code === '23505') {
        setError('Ese período ya existe.')
      } else {
        setError(error.message)
      }

      setSaving(false)
      return
    }

    setForm({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      start_date: '',
      end_date: '',
    })

    await cargarPeriodos()

    setSaving(false)
  }

  async function cambiarEstado(periodo) {
    const nuevoEstado = !periodo.closed

    const { error } = await supabase
      .from('periods')
      .update({
        closed: nuevoEstado,
      })
      .eq('id', periodo.id)

    if (error) {
      console.error(error)
      setError(
        'No se pudo cambiar el estado del período.'
      )
      return
    }

    await cargarPeriodos()
  }

  return (
    <main className="periods-page">

      {/* ENCABEZADO */}

      <header className="periods-page-header">

        <div className="periods-title-icon">
          📅
        </div>

        <div>
          <h1>Períodos de revisión</h1>
          <p>
            Administra los períodos mensuales de revisión de agendas.
          </p>
        </div>

        <button
          type="button"
          className="periods-back-button"
          onClick={() => window.history.back()}
        >
          ← Volver
        </button>

      </header>

      <section className="periods-content">

        {/* FORMULARIO */}

        <div className="periods-form-card">

          <div className="periods-card-header">

            <div className="periods-card-icon">
              ➕
            </div>

            <div>
              <h2>Registrar nuevo período</h2>
              <p>
                Define el mes y las fechas que serán utilizadas
                para las revisiones.
              </p>
            </div>

          </div>

          <form onSubmit={registrarPeriodo}>

            <div className="periods-form-grid">

              <div className="periods-field">
                <label>Año</label>

                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={cambiarCampo}
                  min="2020"
                  max="2100"
                  required
                />
              </div>

              <div className="periods-field">
                <label>Mes</label>

                <select
                  name="month"
                  value={form.month}
                  onChange={cambiarCampo}
                  required
                >
                  {meses.map((mes, index) => (
                    <option
                      key={mes}
                      value={index + 1}
                    >
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              <div className="periods-field">
                <label>Fecha de inicio</label>

                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              <div className="periods-field">
                <label>Fecha de fin</label>

                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={cambiarCampo}
                  required
                />
              </div>

            </div>

            {error && (
              <div className="periods-error">
                ⚠️ {error}
              </div>
            )}

            <div className="periods-form-actions">

              <button
                type="submit"
                className="periods-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Guardando período...'
                  : 'Registrar período'}
              </button>

            </div>

          </form>

        </div>

        {/* LISTADO */}

        <div className="periods-list-header">

          <div>
            <h2>Períodos registrados</h2>
            <p>
              Consulta y administra los períodos creados.
            </p>
          </div>

          {!loading && periods.length > 0 && (
            <div className="periods-count">
              {periods.length}
            </div>
          )}

        </div>

        {loading ? (

          <div className="periods-empty-card">
            <div className="periods-empty-icon">
              ⏳
            </div>

            <h3>
              Cargando períodos...
            </h3>

            <p>
              Estamos obteniendo los períodos registrados.
            </p>
          </div>

        ) : periods.length === 0 ? (

          <div className="periods-empty-card">

            <div className="periods-empty-icon">
              📅
            </div>

            <h3>
              No hay períodos registrados
            </h3>

            <p>
              Registra el primer período utilizando el formulario superior.
            </p>

          </div>

        ) : (

          <div className="periods-grid">

            {periods.map((periodo) => (

              <div
                className={`period-card ${
                  periodo.closed
                    ? 'period-card-closed'
                    : ''
                }`}
                key={periodo.id}
              >

                <div className="period-card-top">

                  <div className="period-calendar-icon">
                    📅
                  </div>

                  <span
                    className={`period-status ${
                      periodo.closed
                        ? 'closed'
                        : 'open'
                    }`}
                  >
                    {periodo.closed
                      ? 'Cerrado'
                      : 'Abierto'}
                  </span>

                </div>

                <div className="period-card-title">
                  <h3>
                    {periodo.name}
                  </h3>

                  <p>
                    Período de revisión
                  </p>
                </div>

                <div className="period-details">

                  <div className="period-detail">
                    <span className="period-detail-label">
                      Año
                    </span>

                    <strong>
                      {periodo.year}
                    </strong>
                  </div>

                  <div className="period-detail">
                    <span className="period-detail-label">
                      Mes
                    </span>

                    <strong>
                      {meses[periodo.month - 1]}
                    </strong>
                  </div>

                </div>

                <div className="period-dates">

                  <div>
                    <span>
                      Inicio
                    </span>

                    <strong>
                      {periodo.start_date}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Fin
                    </span>

                    <strong>
                      {periodo.end_date}
                    </strong>
                  </div>

                </div>

                <button
                  type="button"
                  className={`period-state-button ${
                    periodo.closed
                      ? 'reopen'
                      : 'close'
                  }`}
                  onClick={() =>
                    cambiarEstado(periodo)
                  }
                >
                  {periodo.closed
                    ? '🔓 Abrir período'
                    : '🔒 Cerrar período'}
                </button>

              </div>

            ))}

          </div>

        )}

      </section>
    </main>
  )
}

export default Periods