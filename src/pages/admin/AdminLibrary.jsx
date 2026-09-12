import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminLibrary.css'

function AdminLibrary() {
  const navigate = useNavigate()

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [analizado, setAnalizado] = useState(false)

  const [formulario, setFormulario] = useState({
    title: '',
    author: '',
    category: 'General',
    description: '',
    pages: '',
    pdf_url: '',
  })

  const cargarLibros = async () => {
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('library_books')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error(queryError)
      setError('No se pudieron cargar los libros.')
      setBooks([])
    } else {
      setBooks(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    cargarLibros()
  }, [])

  const abrirFormulario = () => {
    setFormulario({
      title: '',
      author: '',
      category: 'General',
      description: '',
      pages: '',
      pdf_url: '',
    })

    setError('')
    setAnalizado(false)
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    if (guardando || analizando) {
      return
    }

    setMostrarFormulario(false)
  }

  const manejarCambio = (e) => {
    const { name, value } = e.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))

    if (name === 'pdf_url') {
      setAnalizado(false)
    }
  }

  const analizarLibro = async () => {
    const url = formulario.pdf_url.trim()

    if (!url) {
      setError('Primero pega el enlace del PDF de Google Drive.')
      return
    }

    if (!url.includes('drive.google.com')) {
      setError(
        'El enlace debe corresponder a un archivo de Google Drive.'
      )
      return
    }

    setAnalizando(true)
    setError('')
    setAnalizado(false)

    try {
      const proxyUrl = import.meta.env.VITE_LIBRARY_PROXY_URL

      if (!proxyUrl) {
        throw new Error(
          'No está configurada la URL del servidor de Biblioteca.'
        )
      }

      const respuesta = await fetch(
        `${proxyUrl.replace(/\/$/, '')}/api/library/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf_url: url,
          }),
        }
      )

      const resultado = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          resultado.error ||
            'No se pudo analizar el PDF.'
        )
      }

      setFormulario((actual) => ({
        ...actual,

        title:
          resultado.title ||
          actual.title,

        author:
          resultado.author ||
          actual.author,

        category:
          resultado.category ||
          actual.category,

        description:
          resultado.description ||
          actual.description,

        pages:
          resultado.pages
            ? String(resultado.pages)
            : actual.pages,

        pdf_url: url,
      }))

      setAnalizado(true)

    } catch (analisisError) {
      console.error(
        'ERROR AL ANALIZAR LIBRO:',
        analisisError
      )

      setError(
        analisisError.message ||
          'No se pudo analizar el libro.'
      )
    } finally {
      setAnalizando(false)
    }
  }

  const guardarLibro = async (e) => {
    e.preventDefault()

    if (!formulario.title.trim()) {
      setError('El título del libro es obligatorio.')
      return
    }

    if (!formulario.pdf_url.trim()) {
      setError('El enlace de Google Drive es obligatorio.')
      return
    }

    setGuardando(true)
    setError('')

    const paginas =
      formulario.pages.trim() === ''
        ? null
        : Number(formulario.pages)

    if (
      paginas !== null &&
      (!Number.isInteger(paginas) || paginas <= 0)
    ) {
      setError(
        'El número de páginas debe ser un número entero mayor que 0.'
      )

      setGuardando(false)
      return
    }

    const { error: insertError } = await supabase
      .from('library_books')
      .insert({
        title: formulario.title.trim(),
        author: formulario.author.trim() || null,
        category:
          formulario.category.trim() || 'General',
        description:
          formulario.description.trim() || null,
        pages: paginas,
        pdf_url: formulario.pdf_url.trim(),
        active: true,
      })

    if (insertError) {
      console.error(insertError)

      setError(
        `No se pudo guardar el libro: ${insertError.message}`
      )

      setGuardando(false)
      return
    }

    setGuardando(false)
    setMostrarFormulario(false)

    await cargarLibros()
  }

  return (
    <div className="admin-library-page">

      <header className="admin-library-header">

        <div className="admin-library-header-left">

          <button
            type="button"
            className="admin-library-back"
            onClick={() => navigate('/')}
          >
            ← Volver al panel
          </button>

          <div className="admin-library-title">

            <div className="admin-library-icon">
              📚
            </div>

            <div>
              <h1>Biblioteca Digital</h1>

              <p>
                Gestiona los libros disponibles para los estudiantes.
              </p>
            </div>

          </div>

        </div>

        <button
          type="button"
          className="admin-library-new-button"
          onClick={abrirFormulario}
        >
          <span>+</span>
          Nuevo libro
        </button>

      </header>

      {loading && (
        <div className="admin-library-message">
          Cargando biblioteca...
        </div>
      )}

      {error && !mostrarFormulario && (
        <div className="admin-library-message admin-library-error">
          {error}
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="admin-library-empty">

          <div className="admin-library-empty-icon">
            📚
          </div>

          <h2>No hay libros registrados</h2>

          <p>
            Cuando agregues libros aparecerán aquí.
          </p>

          <button
            type="button"
            onClick={abrirFormulario}
          >
            + Agregar primer libro
          </button>

        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <section className="admin-library-content">

          <div className="admin-library-summary">
            <span>
              Libros registrados
            </span>

            <strong>
              {books.length}
            </strong>
          </div>

          <div className="admin-library-grid">

            {books.map((book) => (
              <article
                key={book.id}
                className="admin-library-book-card"
              >

                <div className="admin-library-book-cover">

                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={`Portada de ${book.title}`}
                    />
                  ) : (
                    <div className="admin-library-book-cover-placeholder">
                      <span>📖</span>
                      <small>Biblioteca Digital</small>
                    </div>
                  )}

                </div>

                <div className="admin-library-book-info">

                  <div className="admin-library-book-status">
                    <span
                      className={
                        book.active
                          ? 'status-active'
                          : 'status-inactive'
                      }
                    >
                      {book.active
                        ? 'Activo'
                        : 'Inactivo'}
                    </span>
                  </div>

                  <h2>
                    {book.title}
                  </h2>

                  <p className="admin-library-book-author">
                    {book.author ||
                      'Autor no registrado'}
                  </p>

                  <div className="admin-library-book-data">

                    <span>
                      <strong>Categoría:</strong>{' '}
                      {book.category || 'General'}
                    </span>

                    <span>
                      <strong>Páginas:</strong>{' '}
                      {book.pages || '—'}
                    </span>

                    <span>
                      <strong>PDF:</strong>{' '}
                      {book.pdf_url
                        ? 'Configurado'
                        : 'No configurado'}
                    </span>

                  </div>

                  <div className="admin-library-book-actions">

                    <button
                      type="button"
                      className="admin-library-action-secondary"
                      onClick={() =>
                        alert(
                          'Editar libro: siguiente paso'
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="admin-library-action-primary"
                      onClick={() =>
                        alert(
                          'Gestionar libro: siguiente paso'
                        )
                      }
                    >
                      Gestionar
                    </button>

                  </div>

                </div>

              </article>
            ))}

          </div>

        </section>
      )}

      {mostrarFormulario && (
        <div
          className="admin-library-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarFormulario()
            }
          }}
        >

          <div className="admin-library-modal">

            <div className="admin-library-modal-header">

              <div>
                <h2>Nuevo libro</h2>

                <p>
                  Pega el enlace del PDF y analiza su contenido.
                </p>
              </div>

              <button
                type="button"
                className="admin-library-modal-close"
                onClick={cerrarFormulario}
                disabled={
                  guardando || analizando
                }
              >
                ×
              </button>

            </div>

            <form
              className="admin-library-form"
              onSubmit={guardarLibro}
            >

              <div className="admin-library-form-group">

                <label htmlFor="pdf_url">
                  Enlace del PDF en Google Drive *
                </label>

                <div className="admin-library-drive-row">

                  <input
                    id="pdf_url"
                    name="pdf_url"
                    type="url"
                    value={formulario.pdf_url}
                    onChange={manejarCambio}
                    placeholder="https://drive.google.com/file/d/..."
                    required
                  />

                  <button
                    type="button"
                    className="admin-library-analyze-button"
                    onClick={analizarLibro}
                    disabled={analizando}
                  >
                    {analizando
                      ? 'Analizando...'
                      : 'Analizar libro'}
                  </button>

                </div>

                <small>
                  Pega aquí el enlace compartido del PDF.
                  El sistema intentará obtener sus datos automáticamente.
                </small>

              </div>

              {analizado && (
                <div className="admin-library-analysis-success">
                  <strong>
                    Información encontrada
                  </strong>

                  <span>
                    Revisa los datos antes de guardar el libro.
                  </span>
                </div>
              )}

              <div className="admin-library-form-row">

                <div className="admin-library-form-group">

                  <label htmlFor="title">
                    Título del libro *
                  </label>

                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formulario.title}
                    onChange={manejarCambio}
                    placeholder="Título detectado"
                    required
                  />

                </div>

                <div className="admin-library-form-group">

                  <label htmlFor="author">
                    Autor
                  </label>

                  <input
                    id="author"
                    name="author"
                    type="text"
                    value={formulario.author}
                    onChange={manejarCambio}
                    placeholder="Autor detectado"
                  />

                </div>

              </div>

              <div className="admin-library-form-row">

                <div className="admin-library-form-group">

                  <label htmlFor="category">
                    Categoría
                  </label>

                  <select
                    id="category"
                    name="category"
                    value={formulario.category}
                    onChange={manejarCambio}
                  >
                    <option value="General">
                      General
                    </option>

                    <option value="Cuentos">
                      Cuentos
                    </option>

                    <option value="Ciencia">
                      Ciencia
                    </option>

                    <option value="Aventura">
                      Aventura
                    </option>

                    <option value="Historia">
                      Historia
                    </option>

                    <option value="Literatura">
                      Literatura
                    </option>

                    <option value="Educación">
                      Educación
                    </option>
                  </select>

                </div>

                <div className="admin-library-form-group">

                  <label htmlFor="pages">
                    Número de páginas
                  </label>

                  <input
                    id="pages"
                    name="pages"
                    type="number"
                    min="1"
                    value={formulario.pages}
                    onChange={manejarCambio}
                    placeholder="Páginas detectadas"
                  />

                </div>

              </div>

              <div className="admin-library-form-group">

                <label htmlFor="description">
                  Descripción
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formulario.description}
                  onChange={manejarCambio}
                  placeholder="Descripción detectada del libro..."
                  rows="4"
                />

              </div>

              {error && (
                <div className="admin-library-form-error">
                  {error}
                </div>
              )}

              <div className="admin-library-form-actions">

                <button
                  type="button"
                  className="admin-library-form-cancel"
                  onClick={cerrarFormulario}
                  disabled={
                    guardando || analizando
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="admin-library-form-save"
                  disabled={
                    guardando || analizando
                  }
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Guardar libro'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  )
}

export default AdminLibrary