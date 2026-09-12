import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Document,
  Page,
  pdfjs,
} from 'react-pdf'

import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

import './StudentReader.css'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc =
  new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

const INACTIVITY_LIMIT = 60
const SAVE_INTERVAL = 10

function StudentReader({
  profile,
  cerrarSesion,
}) {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const [libro, setLibro] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [pageNumber, setPageNumber] =
    useState(1)

  const [numPages, setNumPages] =
    useState(0)

  const [pdfLoading, setPdfLoading] =
    useState(true)

  const [pdfError, setPdfError] =
    useState('')

  /*
   * =========================
   * ZOOM Y AJUSTE DE PANTALLA
   * =========================
   */

  const [zoom, setZoom] =
    useState(1)

  const [ajustarPantalla, setAjustarPantalla] =
    useState(true)

  const [viewerWidth, setViewerWidth] =
    useState(820)

  const pdfContainerRef =
    useRef(null)


  const [loanId, setLoanId] =
    useState(null)

  const [progressId, setProgressId] =
    useState(null)

  const [progressLoading, setProgressLoading] =
    useState(true)

  /*
   * =========================
   * TIEMPO DE LECTURA
   * =========================
   */

  const [readingSeconds, setReadingSeconds] =
    useState(0)

  const [readingActive, setReadingActive] =
    useState(false)

  const [readingCompleted, setReadingCompleted] =
    useState(false)

  const readingCompletedRef =
    useRef(false)

  const readingSecondsRef =
    useRef(0)

  const lastActivityRef =
    useRef(Date.now())

  const lastSavedSecondsRef =
    useRef(0)

  const lastSaveTimeRef =
    useRef(Date.now())

  /*
   * =========================
   * CARGAR LIBRO
   * =========================
   */

  useEffect(() => {
    cargarLibro()
  }, [bookId, profile])

  async function cargarLibro() {
    try {
      setLoading(true)
      setError('')
      setProgressLoading(true)

      if (!bookId) {
        setError(
          'No se recibió el identificador del libro.'
        )
        return
      }

      if (!profile?.id) {
        setError(
          'No se pudo identificar al estudiante.'
        )
        return
      }

      /*
       * =========================
       * CARGAR LIBRO
       * =========================
       */

      const {
        data,
        error: libroError,
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
          pdf_url
        `)
        .eq('id', bookId)
        .eq('active', true)
        .single()

      if (libroError) {
        console.error(
          'ERROR AL CARGAR LIBRO:',
          libroError
        )

        setError(
          'No se pudo cargar el libro.'
        )

        return
      }

      setLibro(data)

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

      /*
       * =========================
       * BUSCAR PRÉSTAMO ACTIVO
       * =========================
       */

      const {
        data: prestamo,
        error: prestamoError,
      } = await supabase
        .from('library_loans')
        .select(`
          id,
          book_id,
          due_at,
          status
        `)
        .eq('student_id', student.id)
        .eq('book_id', bookId)
        .eq('status', 'active')
        .maybeSingle()

      if (prestamoError) {
        console.error(
          'ERROR AL CARGAR PRÉSTAMO:',
          prestamoError
        )

        setError(
          'No se pudo verificar el préstamo del libro.'
        )

        return
      }

      if (!prestamo) {
        setError(
          'No tienes un préstamo activo de este libro.'
        )

        return
      }

      setLoanId(prestamo.id)

      /*
       * =========================
       * BUSCAR PROGRESO
       * =========================
       */

      const {
        data: progreso,
        error: progresoError,
      } = await supabase
        .from('library_reading_progress')
        .select(`
          id,
          loan_id,
          current_page,
          total_pages,
          progress_percent,
          reading_seconds,
          started_at,
          last_read_at,
          completed_at,
          status
        `)
        .eq('loan_id', prestamo.id)
        .maybeSingle()

      if (progresoError) {
        console.error(
          'ERROR AL CARGAR PROGRESO:',
          progresoError
        )

        /*
         * No impedimos abrir el libro.
         * Si no existe progreso, empezará
         * desde la página 1 y tiempo 0.
         */
      }

      if (progreso) {
        setProgressId(progreso.id)

        const paginaGuardada =
          Number(
            progreso.current_page
          ) || 1

        setPageNumber(
          Math.max(
            paginaGuardada,
            1
          )
        )

        const tiempoGuardado =
          Number(
            progreso.reading_seconds
          ) || 0

        setReadingSeconds(
          tiempoGuardado
        )

        const progresoCompletado =
          progreso.status === 'completed' ||
          Number(progreso.progress_percent) >= 100

        setReadingCompleted(progresoCompletado)
        readingCompletedRef.current =
          progresoCompletado
        setReadingActive(false)

        readingSecondsRef.current =
          tiempoGuardado

        lastSavedSecondsRef.current =
          tiempoGuardado
      } else {
        setReadingCompleted(false)
        readingCompletedRef.current = false
        setReadingSeconds(0)

        readingSecondsRef.current = 0

        lastSavedSecondsRef.current = 0
      }

      lastActivityRef.current =
        Date.now()

      lastSaveTimeRef.current =
        Date.now()

    } catch (err) {
      console.error(
        'ERROR INESPERADO:',
        err
      )

      setError(
        'Ocurrió un error al cargar el libro.'
      )
    } finally {
      setLoading(false)
      setProgressLoading(false)
    }
  }

  /*
   * =========================
   * URL DEL PDF
   * =========================
   */

  const pdfSource = useMemo(() => {
    if (!bookId) {
      return null
    }

    const proxyUrl =
      import.meta.env.VITE_LIBRARY_PROXY_URL

    if (!proxyUrl) {
      console.error(
        'Falta VITE_LIBRARY_PROXY_URL en las variables de entorno.'
      )

      return null
    }

    return `${proxyUrl.replace(/\/$/, '')}/api/library/books/${bookId}/pdf`
  }, [bookId])

  /*
   * =========================
   * MEDIR ÁREA DEL LECTOR
   * =========================
   */

  useEffect(() => {
    const elemento =
      pdfContainerRef.current

    if (!elemento) {
      return
    }

    function actualizarAncho() {
      const ancho =
        elemento.clientWidth - 48

      if (ancho > 0) {
        setViewerWidth(
          Math.max(
            280,
            ancho
          )
        )
      }
    }

    actualizarAncho()

    const observer =
      new ResizeObserver(
        actualizarAncho
      )

    observer.observe(
      elemento
    )

    return () => {
      observer.disconnect()
    }
  }, [pdfLoading, pdfError])

  /*
   * =========================
   * CONTROLES DE ZOOM
   * =========================
   */

  function acercarPdf() {
    setAjustarPantalla(false)

    setZoom((zoomActual) =>
      Math.min(
        1.8,
        Number(
          (zoomActual + 0.1).toFixed(2)
        )
      )
    )
  }

  function alejarPdf() {
    setAjustarPantalla(false)

    setZoom((zoomActual) =>
      Math.max(
        0.6,
        Number(
          (zoomActual - 0.1).toFixed(2)
        )
      )
    )
  }

  function ajustarPdfAPantalla() {
    setAjustarPantalla(true)
    setZoom(1)
  }

  const anchoPagina =
    ajustarPantalla
      ? viewerWidth
      : Math.round(
          820 * zoom
        )

  /*
   * =========================
   * EVENTOS DEL DOCUMENTO PDF
   * =========================
   */

  function onDocumentLoadSuccess(
    documento
  ) {
    const paginas =
      Number(
        documento?.numPages
      ) || 0

    setNumPages(paginas)
    setPdfLoading(false)
    setPdfError('')

    if (paginas > 0) {
      setPageNumber(
        (paginaActual) =>
          Math.min(
            Math.max(
              paginaActual,
              1
            ),
            paginas
          )
      )
    }

    lastActivityRef.current =
      Date.now()

    if (
      !readingCompletedRef.current &&
      !progressLoading
    ) {
      setReadingActive(true)
    }
  }

  function onDocumentLoadError(
    errorPdf
  ) {
    console.error(
      'ERROR AL CARGAR PDF:',
      errorPdf
    )

    setPdfLoading(false)
    setPdfError(
      'No se pudo cargar el archivo PDF. Intenta nuevamente.'
    )
    setReadingActive(false)
  }


  /*
   * =========================
   * GUARDAR PROGRESO
   * =========================
   */

  const guardarProgreso = useCallback(
    async (
      nuevaPagina = pageNumber,
      segundos = readingSecondsRef.current
    ) => {
      // Una lectura completada es un registro oficial e inmutable.
      // Permite navegar, pero nunca vuelve a contar tiempo ni modifica
      // la fecha, porcentaje o tiempo de culminación.
      if (readingCompletedRef.current) {
        return
      }

      if (
        !loanId ||
        !nuevaPagina ||
        !numPages
      ) {
        return
      }

      const porcentaje =
        Math.min(
          100,
          Math.round(
            (nuevaPagina / numPages) *
              100 *
              100
          ) / 100
        )

      const estaCompletado =
        porcentaje >= 100 ||
        nuevaPagina >= numPages

      const ahora =
        new Date().toISOString()

      if (estaCompletado) {
        readingCompletedRef.current = true
        setReadingCompleted(true)
        setReadingActive(false)
      }

      try {
        /*
         * Si ya existe el registro,
         * lo actualizamos.
         */

        if (progressId) {
          const {
            error: updateError,
          } = await supabase
            .from(
              'library_reading_progress'
            )
            .update({
              current_page:
                nuevaPagina,

              total_pages:
                numPages,

              progress_percent:
                porcentaje,

              reading_seconds:
                Math.max(
                  0,
                  Math.floor(
                    segundos
                  )
                ),

              last_read_at:
                ahora,

              completed_at:
                estaCompletado
                  ? ahora
                  : null,

              status:
                estaCompletado
                  ? 'completed'
                  : 'reading',

              updated_at:
                ahora,
            })
            .eq(
              'id',
              progressId
            )

          if (updateError) {
            console.error(
              'ERROR AL ACTUALIZAR PROGRESO:',
              updateError
            )

            return
          }

          lastSavedSecondsRef.current =
            Math.floor(
              segundos
            )

          lastSaveTimeRef.current =
            Date.now()

          return
        }

        /*
         * Si todavía no existe,
         * intentamos crearlo.
         */

        const {
          data: nuevoProgreso,
          error: insertError,
        } = await supabase
          .from(
            'library_reading_progress'
          )
          .insert({
            loan_id:
              loanId,

            current_page:
              nuevaPagina,

            total_pages:
              numPages,

            progress_percent:
              porcentaje,

            reading_seconds:
              Math.max(
                0,
                Math.floor(
                  segundos
                )
              ),

            started_at:
              ahora,

            last_read_at:
              ahora,

            completed_at:
              estaCompletado
                ? ahora
                : null,

            status:
              estaCompletado
                ? 'completed'
                : 'reading',
          })
          .select(`
            id
          `)
          .single()

        if (insertError) {
          console.error(
            'ERROR AL CREAR PROGRESO:',
            insertError
          )

          return
        }

        setProgressId(
          nuevoProgreso.id
        )

        lastSavedSecondsRef.current =
          Math.floor(
            segundos
          )

        lastSaveTimeRef.current =
          Date.now()

      } catch (err) {
        console.error(
          'ERROR INESPERADO AL GUARDAR PROGRESO:',
          err
        )
      }
    },
    [
      loanId,
      numPages,
      pageNumber,
      progressId,
    ]
  )

  /*
   * =========================
   * ACTIVIDAD DEL ESTUDIANTE
   * =========================
   */

  const registrarActividad =
    useCallback(() => {
      lastActivityRef.current =
        Date.now()

      if (
        !readingCompleted &&
        !pdfLoading &&
        !pdfError &&
        !progressLoading
      ) {
        setReadingActive(true)
      }
    }, [
      pdfLoading,
      pdfError,
      progressLoading,
      readingCompleted,
    ])

  /*
   * =========================
   * DETECTAR ACTIVIDAD
   * =========================
   */

  useEffect(() => {
    const eventos = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    eventos.forEach((evento) => {
      window.addEventListener(
        evento,
        registrarActividad
      )
    })

    return () => {
      eventos.forEach((evento) => {
        window.removeEventListener(
          evento,
          registrarActividad
        )
      })
    }
  }, [registrarActividad])

  /*
   * =========================
   * PAUSAR AL CAMBIAR DE PESTAÑA
   * =========================
   */

  useEffect(() => {
    function manejarVisibilidad() {
      if (
        document.visibilityState ===
        'hidden'
      ) {
        setReadingActive(false)

        if (!readingCompletedRef.current) {
          guardarProgreso(
            pageNumber,
            readingSecondsRef.current
          )
        }
      } else {
        lastActivityRef.current =
          Date.now()

        if (
          !readingCompletedRef.current &&
          !pdfLoading &&
          !pdfError &&
          !progressLoading
        ) {
          setReadingActive(true)
        } else if (readingCompletedRef.current) {
          setReadingActive(false)
        }
      }
    }

    document.addEventListener(
      'visibilitychange',
      manejarVisibilidad
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        manejarVisibilidad
      )
    }
  }, [
    guardarProgreso,
    pageNumber,
    pdfError,
    pdfLoading,
    progressLoading,
    readingCompleted,
  ])

  /*
   * =========================
   * CRONÓMETRO DE LECTURA
   * =========================
   */

  useEffect(() => {
    if (
      pdfLoading ||
      pdfError ||
      progressLoading ||
      !loanId ||
      !numPages ||
      readingCompleted
    ) {
      return
    }

    const intervalo =
      setInterval(() => {
        if (readingCompletedRef.current) {
          setReadingActive(false)
          return
        }

        const ahora =
          Date.now()

        const segundosSinActividad =
          Math.floor(
            (
              ahora -
              lastActivityRef.current
            ) / 1000
          )

        if (
          document.visibilityState ===
          'hidden'
        ) {
          setReadingActive(false)

          return
        }

        if (
          segundosSinActividad >=
          INACTIVITY_LIMIT
        ) {
          setReadingActive(false)

          return
        }

        setReadingActive(true)

        readingSecondsRef.current += 1

        setReadingSeconds(
          readingSecondsRef.current
        )

        const segundosDesdeGuardado =
          readingSecondsRef.current -
          lastSavedSecondsRef.current

        if (
          segundosDesdeGuardado >=
          SAVE_INTERVAL
        ) {
          guardarProgreso(
            pageNumber,
            readingSecondsRef.current
          )
        }
      }, 1000)

    return () => {
      clearInterval(intervalo)
    }
  }, [
    loanId,
    numPages,
    pageNumber,
    pdfError,
    pdfLoading,
    progressLoading,
    readingCompleted,
    guardarProgreso,
  ])

  /*
   * =========================
   * GUARDAR AL SALIR
   * =========================
   */

  useEffect(() => {
    function guardarAntesDeSalir() {
      if (
        loanId &&
        numPages &&
        !readingCompletedRef.current
      ) {
        guardarProgreso(
          pageNumber,
          readingSecondsRef.current
        )
      }
    }

    window.addEventListener(
      'beforeunload',
      guardarAntesDeSalir
    )

    return () => {
      window.removeEventListener(
        'beforeunload',
        guardarAntesDeSalir
      )
    }
  }, [
    guardarProgreso,
    loanId,
    numPages,
    pageNumber,
  ])

  /*
   * =========================
   * CAMBIAR DE PÁGINA
   * =========================
   */

  // La lectura completada detiene el cronómetro, pero NO bloquea la navegación.
  // El estudiante puede volver a revisar cualquier página del libro.
  function paginaAnterior() {
    const nuevaPagina =
      Math.max(
        pageNumber - 1,
        1
      )

    setPageNumber(
      nuevaPagina
    )

    if (!readingCompletedRef.current) {
      registrarActividad()

      guardarProgreso(
        nuevaPagina,
        readingSecondsRef.current
      )
    }
  }

  function paginaSiguiente() {
    const nuevaPagina =
      Math.min(
        pageNumber + 1,
        numPages
      )

    setPageNumber(
      nuevaPagina
    )

    if (!readingCompletedRef.current) {
      registrarActividad()

      guardarProgreso(
        nuevaPagina,
        readingSecondsRef.current
      )
    }
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
      Math.floor(
        total / 3600
      )

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
   * VOLVER A BIBLIOTECA
   * =========================
   */

  async function volverBiblioteca() {
    await guardarProgreso(
      pageNumber,
      readingSecondsRef.current
    )

    navigate('/estudiante/biblioteca')
  }

  /*
   * =========================
   * PORCENTAJE
   * =========================
   */

  const totalPages =
    numPages ||
    libro?.pages ||
    0

  const porcentaje =
    readingCompleted
      ? 100
      : totalPages > 0
        ? Math.round(
            (pageNumber /
              totalPages) *
              100
          )
        : 0

  /*
   * =========================
   * PANTALLA DE CARGA
   * =========================
   */

  if (loading) {
    return (
      <main className="student-reader-page">

        <div className="student-reader-loading">

          <div className="reader-loading-icon">
            📖
          </div>

          <h2>
            Cargando libro...
          </h2>

          <p>
            Preparando la lectura.
          </p>

        </div>

      </main>
    )
  }

  /*
   * =========================
   * ERROR
   * =========================
   */

  if (
    error ||
    !libro
  ) {
    return (
      <main className="student-reader-page">

        <div className="student-reader-error">

          <div className="reader-error-icon">
            ⚠
          </div>

          <h2>
            No se pudo abrir el libro
          </h2>

          <p>
            {error ||
              'El libro no está disponible.'}
          </p>

          <button
            className="reader-back-button"
            onClick={
              volverBiblioteca
            }
          >
            ← Volver a la biblioteca
          </button>

        </div>

      </main>
    )
  }

  /*
   * =========================
   * LECTOR
   * =========================
   */

  return (
    <main className="student-reader-page">

      <header className="student-reader-header">

        <div className="reader-header-left">

          <button
            className="reader-back-link"
            onClick={
              volverBiblioteca
            }
          >
            ← Biblioteca
          </button>

          <div className="reader-book-title">

            <strong>
              {libro.title}
            </strong>

            <span>
              {libro.author ||
                'Autor no registrado'}
            </span>

          </div>

        </div>

        <button
          className="student-reader-logout"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>

      </header>

      <section className="student-reader-content">

        <div className="reader-book-info">

          <div>

            <p className="reader-label">
              LECTURA DIGITAL
            </p>

            <h1>
              {libro.title}
            </h1>

            <p className="reader-author">
              {libro.author ||
                'Autor no registrado'}
            </p>

          </div>

          <div className="reader-progress-summary">

            <span>
              Página {pageNumber} de {totalPages}
            </span>

            <strong>
              {porcentaje}%
            </strong>

          </div>

        </div>

        <div className="reader-progress-bar">

          <div
            className="reader-progress-fill"
            style={{
              width:
                `${porcentaje}%`,
            }}
          />

        </div>

        <div
          className="reader-reading-time"
        >
          <div>
            <span>
              Tiempo de lectura
            </span>

            <strong>
              {formatearTiempo(
                readingSeconds
              )}
            </strong>
          </div>

          <div>
            <span>
              Estado
            </span>

            <strong>
              {readingCompleted
                ? 'Lectura completada'
                : readingActive
                  ? 'Leyendo'
                  : 'En pausa'}
            </strong>
          </div>
        </div>

        <section className="reader-viewer">

          {!pdfSource ? (

            <div className="reader-no-pdf">

              <div>
                📖
              </div>

              <h2>
                PDF no disponible
              </h2>

              <p>
                Este libro todavía no tiene
                un archivo de lectura registrado.
              </p>

            </div>

          ) : (

            <div
              ref={pdfContainerRef}
              className="reader-pdf-container"
            >

              {(pdfLoading ||
                progressLoading) && (

                <div className="reader-pdf-loading">

                  <div className="reader-loading-icon">
                    📖
                  </div>

                  <h3>
                    Preparando lectura...
                  </h3>

                  <p>
                    Recuperando tu progreso.
                  </p>

                </div>

              )}

              {pdfError ? (

                <div className="reader-pdf-error">

                  <div>
                    ⚠
                  </div>

                  <h2>
                    No se pudo cargar el PDF
                  </h2>

                  <p>
                    {pdfError}
                  </p>

                </div>

              ) : (

                <Document
                  file={pdfSource}
                  onLoadSuccess={
                    onDocumentLoadSuccess
                  }
                  onLoadError={
                    onDocumentLoadError
                  }
                  loading=""
                >

                  <div
                    className="reader-pdf-page"
                    style={{
                      visibility:
                        pdfLoading ||
                        progressLoading
                          ? 'hidden'
                          : 'visible',
                    }}
                  >

                    <Page
                      pageNumber={
                        pageNumber
                      }
                      width={anchoPagina}
                      renderTextLayer={
                        true
                      }
                      renderAnnotationLayer={
                        true
                      }
                    />

                  </div>

                </Document>

              )}

            </div>

          )}

        </section>

        <div className="reader-zoom-controls">
          <button
            type="button"
            className="reader-zoom-button"
            onClick={alejarPdf}
            disabled={zoom <= 0.6 && !ajustarPantalla}
            aria-label="Alejar PDF"
            title="Alejar"
          >
            −
          </button>

          <button
            type="button"
            className={
              `reader-zoom-level ${
                ajustarPantalla
                  ? 'active'
                  : ''
              }`
            }
            onClick={ajustarPdfAPantalla}
            title="Ajustar el PDF al ancho disponible"
          >
            {ajustarPantalla
              ? 'Ajustar pantalla'
              : `${Math.round(zoom * 100)}%`}
          </button>

          <button
            type="button"
            className="reader-zoom-button"
            onClick={acercarPdf}
            disabled={zoom >= 1.8 && !ajustarPantalla}
            aria-label="Acercar PDF"
            title="Acercar"
          >
            +
          </button>
        </div>

        <div className="reader-controls">

          <button
            className="reader-control-button"
            onClick={
              paginaAnterior
            }
            disabled={
              pageNumber <= 1 ||
              loading ||
              pdfLoading ||
              !!pdfError
            }
          >
            ← Página anterior
          </button>

          <span className="reader-page-indicator">
            Página {pageNumber} de {totalPages}
          </span>

          <button
            className="reader-control-button"
            onClick={
              paginaSiguiente
            }
            disabled={
              pageNumber >= numPages ||
              loading ||
              pdfLoading ||
              !!pdfError
            }
          >
            Página siguiente →
          </button>

        </div>

      </section>

    </main>
  )
}

export default StudentReader