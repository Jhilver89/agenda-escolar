import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './StudentLibrary.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

function StudentLibrary({ profile, cerrarSesion }) {
  const navigate = useNavigate()

  const [libros, setLibros] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')

  const [studentId, setStudentId] = useState(null)
  const [prestamos, setPrestamos] = useState({})
  const [historialLecturas, setHistorialLecturas] =
    useState({})
  const [librosPrestados, setLibrosPrestados] =
    useState(new Set())

  const [certificados, setCertificados] =
    useState({})

  const [loading, setLoading] = useState(true)
  const [loadingPrestamos, setLoadingPrestamos] =
    useState(true)

  const [error, setError] = useState('')
  const [loanError, setLoanError] = useState('')

  const [prestandoId, setPrestandoId] =
    useState(null)

  useEffect(() => {
    cargarDatos()
  }, [profile])

  async function cargarDatos() {
    try {
      setLoading(true)
      setError('')

      if (!profile?.id) {
        setError(
          'No se pudo identificar al estudiante.'
        )

        return
      }

      /*
       * =========================
       * BUSCAR ESTUDIANTE
       * =========================
       */

      const {
        data: student,
        error: studentError,
      } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          full_name,
          profile_id
        `)
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

      setStudentId(student.id)

      /*
       * =========================
       * CARGAR LIBROS,
       * PRÉSTAMOS,
       * DISPONIBILIDAD
       * Y CERTIFICADOS
       * =========================
       */

      await Promise.all([
        cargarLibros(),
        cargarPrestamos(student.id),
        cargarDisponibilidad(),
        cargarCertificados(),
      ])
    } catch (err) {
      console.error(
        'ERROR INESPERADO:',
        err
      )

      setError(
        'Ocurrió un error al cargar la biblioteca.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function cargarLibros() {
    const {
      data,
      error: librosError,
    } = await supabase
      .from('library_books')
      .select(`
        id,
        title,
        author,
        category,
        description,
        pages,
        cover_url,
        pdf_url,
        active
      `)
      .eq('active', true)
      .order('title', {
        ascending: true,
      })

    if (librosError) {
      console.error(
        'ERROR AL CARGAR LIBROS:',
        librosError
      )

      setError(
        'No se pudo cargar la Biblioteca Digital.'
      )

      return
    }

    setLibros(data || [])
  }

  async function cargarPrestamos(id) {
    try {
      setLoadingPrestamos(true)

      const {
        data,
        error: prestamosError,
      } = await supabase
        .from('library_loans')
        .select(`
          id,
          book_id,
          borrowed_at,
          due_at,
          returned_at,
          status
        `)
        .eq('student_id', id)
        .order('borrowed_at', {
          ascending: false,
        })

      if (prestamosError) {
        console.error(
          'ERROR AL CARGAR PRÉSTAMOS:',
          prestamosError
        )

        return
      }

      const prestamosMap = {}

      for (const prestamo of data || []) {
        if (
          prestamo.status === 'active' &&
          !prestamosMap[prestamo.book_id]
        ) {
          prestamosMap[prestamo.book_id] =
            prestamo
        }
      }

      setPrestamos(prestamosMap)

      const loanIds = (data || []).map(
        (prestamo) => prestamo.id
      )

      if (loanIds.length === 0) {
        setHistorialLecturas({})
        return
      }

      const {
        data: progresos,
        error: progresosError,
      } = await supabase
        .from('library_reading_progress')
        .select(`
          loan_id,
          current_page,
          total_pages,
          progress_percent,
          reading_seconds,
          completed_at,
          status,
          updated_at
        `)
        .in('loan_id', loanIds)

      if (progresosError) {
        console.error(
          'ERROR AL CARGAR HISTORIAL DE LECTURAS:',
          progresosError
        )

        setHistorialLecturas({})
        return
      }

      const historialMap = {}

      for (const prestamo of data || []) {
        const progreso = (progresos || []).find(
          (item) =>
            item.loan_id === prestamo.id &&
            item.status === 'completed' &&
            Number(item.progress_percent) >= 100
        )

        if (!progreso) {
          continue
        }

        if (
          !historialMap[prestamo.book_id] ||
          new Date(
            progreso.completed_at ||
              progreso.updated_at ||
              prestamo.borrowed_at
          ) <
            new Date(
              historialMap[
                prestamo.book_id
              ].completed_at ||
                historialMap[
                  prestamo.book_id
                ].updated_at ||
                historialMap[
                  prestamo.book_id
                ].borrowed_at
            )
        ) {
          historialMap[prestamo.book_id] = {
            ...progreso,
            loan_id: prestamo.id,
            borrowed_at:
              prestamo.borrowed_at,
            returned_at:
              prestamo.returned_at,
          }
        }
      }

      setHistorialLecturas(historialMap)
    } finally {
      setLoadingPrestamos(false)
    }
  }

  async function cargarDisponibilidad() {
    const {
      data,
      error: disponibilidadError,
    } = await supabase.rpc(
      'get_active_library_book_ids'
    )

    if (disponibilidadError) {
      console.error(
        'ERROR AL CARGAR DISPONIBILIDAD:',
        disponibilidadError
      )

      return
    }

    const ids = new Set(
      (data || []).map(
        (item) => item.book_id
      )
    )

    setLibrosPrestados(ids)
  }

  /*
   * =========================
   * CARGAR CERTIFICADOS
   * =========================
   */

  async function cargarCertificados() {
    const {
      data,
      error: certificadosError,
    } = await supabase
      .from('library_certificates')
      .select(`
        id,
        certificate_code,
        book_id,
        loan_id,
        progress_id,
        school_name,
        school_logo_url,
        student_name,
        book_title,
        book_author,
        total_pages,
        reading_seconds,
        completed_at,
        issued_at,
        status
      `)
      .eq('status', 'issued')

    if (certificadosError) {
      console.error(
        'ERROR AL CARGAR CERTIFICADOS:',
        certificadosError
      )

      return
    }

    const certificadosMap = {}

    for (const certificado of data || []) {
      certificadosMap[
        certificado.book_id
      ] = certificado
    }

    setCertificados(certificadosMap)
  }

  /*
   * =========================
   * PRESTAR LIBRO
   * =========================
   */

  async function prestarLibro(libro) {
    if (!studentId) {
      setLoanError(
        'No se pudo identificar al estudiante.'
      )

      return
    }

    if (!libro?.id) {
      return
    }

    setLoanError('')
    setPrestandoId(libro.id)

    try {
      /*
       * Si ya existe un préstamo activo
       * del estudiante, continúa leyendo.
       */

      const prestamoExistente =
        prestamos[libro.id]

      if (prestamoExistente) {
        abrirLector(libro.id)

        return
      }

      /*
       * Verificar nuevamente que la copia
       * siga disponible antes de prestar.
       */

      const {
        data: disponibilidad,
        error: disponibilidadError,
      } = await supabase.rpc(
        'get_active_library_book_ids'
      )

      if (disponibilidadError) {
        console.error(
          'ERROR AL VERIFICAR DISPONIBILIDAD:',
          disponibilidadError
        )

        setLoanError(
          'No se pudo comprobar la disponibilidad del libro.'
        )

        return
      }

      const estaPrestado =
        (disponibilidad || []).some(
          (item) =>
            item.book_id === libro.id
        )

      if (estaPrestado) {
        setLibrosPrestados(
          new Set(
            (disponibilidad || []).map(
              (item) => item.book_id
            )
          )
        )

        setLoanError(
          'Este libro ya está prestado a otro estudiante.'
        )

        return
      }

      /*
       * =========================
       * CREAR PRÉSTAMO
       * =========================
       */

      const {
        data: nuevoPrestamo,
        error: prestamoError,
      } = await supabase
        .from('library_loans')
        .insert({
          student_id: studentId,
          book_id: libro.id,
          borrowed_at:
            new Date().toISOString(),
          due_at:
            new Date(
              Date.now() +
                21 * 24 * 60 * 60 * 1000
            ).toISOString(),
          status: 'active',
        })
        .select(`
          id,
          book_id,
          borrowed_at,
          due_at,
          status
        `)
        .single()

      if (prestamoError) {
        console.error(
          'ERROR AL PRESTAR LIBRO:',
          prestamoError
        )

        if (
          prestamoError.code === '23505'
        ) {
          setLoanError(
            'Este libro ya está prestado a otro estudiante.'
          )
        } else {
          setLoanError(
            'No se pudo realizar el préstamo.'
          )
        }

        return
      }

      /*
       * =========================
       * CREAR / RECUPERAR PROGRESO
       * =========================
       *
       * Si el estudiante ya terminó este libro
       * anteriormente, no iniciamos una lectura
       * nueva desde cero. Copiamos al nuevo préstamo
       * el progreso histórico de la lectura completada.
       *
       * De esta forma:
       * - conserva la página final;
       * - conserva el tiempo de lectura;
       * - conserva el 100 %;
       * - conserva el estado "completed";
       * - el cronómetro no vuelve a comenzar.
       */

      const lecturaAnterior =
        historialLecturas[libro.id]

      const esRelecturaCompletada =
        Boolean(
          lecturaAnterior &&
          Number(
            lecturaAnterior.progress_percent
          ) >= 100 &&
          lecturaAnterior.status ===
            'completed'
        )

      const {
        data: nuevoProgreso,
        error: progresoError,
      } = await supabase
        .from('library_reading_progress')
        .insert({
          loan_id: nuevoPrestamo.id,

          current_page:
            esRelecturaCompletada
              ? Math.max(
                  Number(
                    lecturaAnterior.current_page
                  ) || libro.pages || 1,
                  1
                )
              : 1,

          total_pages:
            esRelecturaCompletada
              ? Number(
                  lecturaAnterior.total_pages
                ) || libro.pages || 1
              : libro.pages || 1,

          progress_percent:
            esRelecturaCompletada
              ? 100
              : 0,

          reading_seconds:
            esRelecturaCompletada
              ? Math.max(
                  Number(
                    lecturaAnterior.reading_seconds
                  ) || 0,
                  0
                )
              : 0,

          started_at:
            esRelecturaCompletada
              ? null
              : null,

          last_read_at:
            esRelecturaCompletada
              ? lecturaAnterior.completed_at ||
                null
              : null,

          completed_at:
            esRelecturaCompletada
              ? lecturaAnterior.completed_at ||
                new Date().toISOString()
              : null,

          status:
            esRelecturaCompletada
              ? 'completed'
              : 'reading',
        })
        .select(`
          id,
          loan_id,
          current_page,
          total_pages,
          progress_percent,
          reading_seconds,
          completed_at,
          status
        `)
        .single()

      if (progresoError) {
        console.error(
          'ERROR AL CREAR PROGRESO:',
          progresoError
        )
      } else if (esRelecturaCompletada && nuevoProgreso) {
        /*
         * Actualizamos también el historial local
         * para que la tarjeta conserve inmediatamente
         * el tiempo y el estado de la lectura.
         */
        setHistorialLecturas((actual) => ({
          ...actual,
          [libro.id]: {
            ...actual[libro.id],
            ...nuevoProgreso,
            loan_id: nuevoPrestamo.id,
            borrowed_at:
              nuevoPrestamo.borrowed_at,
            returned_at: null,
          },
        }))
      }

      /*
       * Actualizar estado local.
       */

      setPrestamos((actuales) => ({
        ...actuales,
        [libro.id]: nuevoPrestamo,
      }))

      setLibrosPrestados(
        (actuales) => {
          const nuevos =
            new Set(actuales)

          nuevos.add(libro.id)

          return nuevos
        }
      )

      /*
       * =========================
       * ABRIR LECTOR
       * =========================
       */

      abrirLector(libro.id)
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL PRESTAR:',
        err
      )

      setLoanError(
        'Ocurrió un error al realizar el préstamo.'
      )
    } finally {
      setPrestandoId(null)
    }
  }

  /*
   * =========================
   * DEVOLVER LIBRO
   * =========================
   */

  async function devolverLibro(libro) {
    if (!studentId || !libro?.id) {
      return
    }

    const prestamo =
      prestamos[libro.id]

    if (!prestamo) {
      return
    }

    const confirmar =
      window.confirm(
        `¿Deseas devolver "${libro.title}"?\n\nPuedes devolverlo aunque todavía no hayas terminado de leerlo.`
      )

    if (!confirmar) {
      return
    }

    setLoanError('')
    setPrestandoId(libro.id)

    try {
      const {
        error: devolucionError,
      } = await supabase
        .from('library_loans')
        .update({
          status: 'returned',
          returned_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', prestamo.id)
        .eq('student_id', studentId)
        .eq('status', 'active')

      if (devolucionError) {
        console.error(
          'ERROR AL DEVOLVER LIBRO:',
          devolucionError
        )

        setLoanError(
          'No se pudo devolver el libro.'
        )

        return
      }

      /*
       * El préstamo deja de estar activo.
       * La copia vuelve a estar disponible.
       */

      setPrestamos((actuales) => {
        const nuevos = {
          ...actuales,
        }

        delete nuevos[libro.id]

        return nuevos
      })

      setLibrosPrestados(
        (actuales) => {
          const nuevos =
            new Set(actuales)

          nuevos.delete(libro.id)

          return nuevos
        }
      )
    } catch (err) {
      console.error(
        'ERROR INESPERADO AL DEVOLVER:',
        err
      )

      setLoanError(
        'Ocurrió un error al devolver el libro.'
      )
    } finally {
      setPrestandoId(null)
    }
  }

  /*
   * =========================
   * VER CERTIFICADO
   * =========================
   */

  function verCertificado(libro) {
    const certificado =
      certificados[libro.id]

    if (!certificado) {
      return
    }

    navigate(
      `/estudiante/biblioteca/certificado/${certificado.id}`
    )
  }

  /*
   * =========================
   * ABRIR LECTOR
   * =========================
   */

  function obtenerPdfUrl(bookId) {
    const proxyUrl = import.meta.env.VITE_LIBRARY_PROXY_URL

    if (!proxyUrl || !bookId) {
      return null
    }

    return `${proxyUrl.replace(/\/$/, '')}/api/library/books/${bookId}/pdf`
  }

  function abrirLector(bookId) {
    navigate(
      `/estudiante/biblioteca/libro/${bookId}`
    )
  }

  /*
   * =========================
   * FORMATO DEL TIEMPO
   * =========================
   */

  function formatearTiempo(
    segundos
  ) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(segundos) || 0
        )
      )

    const horas =
      Math.floor(total / 3600)

    const minutos =
      Math.floor(
        (total % 3600) / 60
      )

    const segundosRestantes =
      total % 60

    if (horas > 0) {
      return `${horas} h ${String(
        minutos
      ).padStart(2, '0')} min`
    }

    if (minutos > 0) {
      return `${minutos} min ${String(
        segundosRestantes
      ).padStart(2, '0')} s`
    }

    return `${segundosRestantes} s`
  }

  /*
   * =========================
   * FORMATO DE VENCIMIENTO
   * =========================
   */

  function obtenerTextoVencimiento(
    fecha
  ) {
    if (!fecha) {
      return ''
    }

    const fechaVencimiento =
      new Date(fecha)

    return fechaVencimiento.toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    )
  }

  /*
   * =========================
   * CATEGORÍAS
   * =========================
   */

  const categorias = [
    'Todas',
    ...Array.from(
      new Set(
        libros
          .map(
            (libro) =>
              libro.category
          )
          .filter(Boolean)
      )
    ),
  ]

  /*
   * =========================
   * FILTRAR LIBROS
   * =========================
   */

  const librosFiltrados =
    libros.filter((libro) => {
      const coincideCategoria =
        categoria === 'Todas' ||
        libro.category === categoria

      const textoBusqueda =
        busqueda
          .toLowerCase()
          .trim()

      const titulo =
        (
          libro.title || ''
        ).toLowerCase()

      const autor =
        (
          libro.author || ''
        ).toLowerCase()

      const coincideBusqueda =
        !textoBusqueda ||
        titulo.includes(
          textoBusqueda
        ) ||
        autor.includes(
          textoBusqueda
        )

      return (
        coincideCategoria &&
        coincideBusqueda
      )
    })

  /*
   * =========================
   * PANTALLA
   * =========================
   */

  return (
    <main className="student-library-page">

      <header className="student-library-header">

        <div className="library-header-left">

          <div className="student-library-logo">
            AE
          </div>

          <div>

            <h1>
              Agenda Escolar
            </h1>

            <p>
              Biblioteca Digital
            </p>

          </div>

        </div>

        <button
          className="student-library-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>

      </header>

      <section className="student-library-content">

        <div className="library-top">

          <div>

            <p className="library-label">
              BIBLIOTECA DIGITAL
            </p>

            <h2>
              Explora, lee y aprende
            </h2>

            <p className="library-description">
              Encuentra libros, cuentos y materiales
              para continuar aprendiendo.
            </p>

          </div>

          <button
            className="library-back-button"
            onClick={() => {
              navigate('/')
            }}
          >
            Volver al portal
          </button>

        </div>

        <section className="library-search-section">

          <div className="library-search">

            <span className="library-search-icon">
              🔎
            </span>

            <input
              type="text"
              placeholder="Buscar por título o autor..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
            />

          </div>

          <div className="library-categories">

            {categorias.map(
              (item) => (

                <button
                  key={item}
                  className={
                    categoria === item
                      ? 'category-button active'
                      : 'category-button'
                  }
                  onClick={() =>
                    setCategoria(item)
                  }
                >
                  {item}
                </button>

              )
            )}

          </div>

        </section>

        <section className="library-books-section">

          <div className="library-section-header">

            <div>

              <p className="library-label">
                CATÁLOGO
              </p>

              <h2>
                Libros disponibles
              </h2>

            </div>

            <span className="library-book-count">
              {librosFiltrados.length}{' '}
              {librosFiltrados.length === 1
                ? 'libro'
                : 'libros'}
            </span>

          </div>

          {loanError && (

            <div className="library-empty">

              <div className="library-empty-icon">
                ⚠
              </div>

              <h3>
                No se pudo realizar la operación
              </h3>

              <p>
                {loanError}
              </p>

              <button
                className="library-read-button"
                onClick={() => {
                  setLoanError('')

                  if (studentId) {
                    cargarPrestamos(
                      studentId
                    )
                  }

                  cargarDisponibilidad()
                }}
              >
                Actualizar disponibilidad
              </button>

            </div>

          )}

          {loading ? (

            <div className="library-empty">

              <div className="library-empty-icon">
                📚
              </div>

              <h3>
                Cargando biblioteca...
              </h3>

              <p>
                Estamos buscando los libros disponibles.
              </p>

            </div>

          ) : error ? (

            <div className="library-empty">

              <div className="library-empty-icon">
                ⚠
              </div>

              <h3>
                No se pudo cargar la biblioteca
              </h3>

              <p>
                {error}
              </p>

              <button
                className="library-read-button"
                onClick={cargarDatos}
              >
                Intentar nuevamente
              </button>

            </div>

          ) : librosFiltrados.length === 0 ? (

            <div className="library-empty">

              <div className="library-empty-icon">
                📚
              </div>

              <h3>
                No encontramos libros
              </h3>

              <p>
                Prueba con otro título, autor o categoría.
              </p>

            </div>

          ) : (

            <div className="library-books-grid">

              {librosFiltrados.map(
                (libro) => {

                  const prestamo =
                    prestamos[
                      libro.id
                    ]

                  const tienePrestamo =
                    Boolean(
                      prestamo
                    )

                  const estaPrestado =
                    librosPrestados.has(
                      libro.id
                    )

                  const prestadoPorOtro =
                    estaPrestado &&
                    !tienePrestamo

                  const certificado =
                    certificados[
                      libro.id
                    ]

                  const tieneCertificado =
                    Boolean(
                      certificado
                    )

                  const lecturaCompletada =
                    historialLecturas[
                      libro.id
                    ]

                  const tieneLecturaCompletada =
                    Boolean(
                      lecturaCompletada
                    )

                  const prestando =
                    prestandoId ===
                    libro.id

                  return (

                    <article
                      className="library-book-card"
                      key={libro.id}
                    >

                      <div className="library-book-cover">

                        {libro.cover_url ? (

                          <img
                            src={
                              libro.cover_url
                            }
                            alt={
                              `Portada de ${libro.title}`
                            }
                          />

                        ) : libro.pdf_url ? (

                          <div className="library-pdf-cover">
                            <Document
                              file={obtenerPdfUrl(libro.id)}
                              loading={
                                <div className="library-cover-placeholder">
                                  <span>📖</span>
                                  <strong>Cargando</strong>
                                  <small>Portada...</small>
                                </div>
                              }
                              error={
                                <div className="library-cover-placeholder">
                                  <span>📖</span>
                                  <strong>Biblioteca</strong>
                                  <small>Digital</small>
                                </div>
                              }
                            >
                              <Page
                                pageNumber={1}
                                width={260}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </Document>
                          </div>

                        ) : (

                          <div className="library-cover-placeholder">

                            <span>
                              📖
                            </span>

                            <strong>
                              Biblioteca
                            </strong>

                            <small>
                              Digital
                            </small>

                          </div>

                        )}

                      </div>

                      <div className="library-book-info">

                        <span className="library-book-category">
                          {libro.category}
                        </span>

                        <h3>
                          {libro.title}
                        </h3>

                        <p className="library-book-author">
                          {libro.author ||
                            'Autor no registrado'}
                        </p>

                        <p className="library-book-description">
                          {libro.description ||
                            'Sin descripción disponible.'}
                        </p>

                        {libro.pages && (

                          <p className="library-book-pages">
                            {libro.pages} páginas
                          </p>

                        )}

                        {tienePrestamo && (

                          <p className="library-book-pages">
                            Préstamo activo · Vence:{' '}
                            {obtenerTextoVencimiento(
                              prestamo.due_at
                            )}
                          </p>

                        )}

                        {tieneLecturaCompletada && (

                          <p className="library-book-pages">
                            Lectura completada · Tiempo:{' '}
                            {formatearTiempo(
                              lecturaCompletada.reading_seconds
                            )}
                            {' · '}
                            {tieneCertificado
                              ? 'Certificado emitido'
                              : 'Estado: Terminado'}
                          </p>

                        )}

                        {tienePrestamo ? (

                          <div className="library-loan-actions">

                            <button
                              className="library-read-button"
                              disabled={
                                !libro.pdf_url ||
                                prestando ||
                                loadingPrestamos
                              }
                              onClick={() =>
                                abrirLector(
                                  libro.id
                                )
                              }
                            >
                              Continuar leyendo
                            </button>

                            <button
                              className="library-return-button"
                              disabled={
                                prestando ||
                                loadingPrestamos
                              }
                              onClick={() =>
                                devolverLibro(
                                  libro
                                )
                              }
                            >
                              Devolver libro
                            </button>

                            {tieneCertificado && (

                              <button
                                className="library-read-button"
                                onClick={() =>
                                  verCertificado(
                                    libro
                                  )
                                }
                              >
                                Ver certificado
                              </button>

                            )}

                          </div>

                        ) : prestadoPorOtro ? (

                          <div className="library-unavailable-book">

                            <span>
                              En préstamo
                            </span>

                            <small>
                              No disponible temporalmente
                            </small>

                          </div>

                        ) : (

                          <button
                            className="library-read-button"
                            disabled={
                              !libro.pdf_url ||
                              prestando ||
                              loadingPrestamos
                            }
                            onClick={() =>
                              prestarLibro(
                                libro
                              )
                            }
                            title={
                              libro.pdf_url
                                ? 'Prestar libro'
                                : 'El PDF todavía no está disponible'
                            }
                          >
                            {prestando
                              ? 'Procesando...'
                              : !libro.pdf_url
                                ? 'Próximamente'
                                : 'Prestar libro'}
                          </button>

                        )}

                      </div>

                    </article>

                  )
                }
              )}

            </div>

          )}

        </section>

      </section>

    </main>
  )
}

export default StudentLibrary