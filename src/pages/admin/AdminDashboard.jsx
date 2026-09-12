import { useNavigate } from 'react-router-dom'

function AdminDashboard({ profile, cerrarSesion }) {
  const navigate = useNavigate()

  return (
    <main className="dashboard">

      <header className="dashboard-header">

        <div>
          <h1>Agenda Escolar</h1>
          <p>Panel de Administración</p>
        </div>

        <div className="user-area">
          <span>{profile.full_name}</span>

          <button onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>

      </header>

      <section className="dashboard-content">

        <h2>Administración del sistema</h2>

        <div className="dashboard-grid">

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/docentes')}
          >
            <div className="card-icon">👨‍🏫</div>
            <h3>Docentes</h3>
            <p>Gestionar docentes y asignaciones.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/asignaciones')}
          >
            <div className="card-icon">📋</div>
            <h3>Asignaciones</h3>
            <p>Asignar docentes a grados y secciones.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/estudiantes')}
          >
            <div className="card-icon">🎓</div>
            <h3>Estudiantes</h3>
            <p>Registrar y administrar estudiantes.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/grados-secciones')}
          >
            <div className="card-icon">🏫</div>
            <h3>Grados y secciones</h3>
            <p>Configurar la estructura educativa.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/periodos')}
          >
            <div className="card-icon">📅</div>
            <h3>Períodos</h3>
            <p>Administrar meses y períodos de revisión.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/dias-revision')}
          >
            <div className="card-icon">🗓️</div>
            <h3>Días de revisión</h3>
            <p>Definir qué días cuentan para la revisión.</p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/revisiones')}
          >
            <div className="card-icon">📋</div>
            <h3>Revisiones</h3>
            <p>
              Registrar y consultar las revisiones de agendas.
            </p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/ranking')}
          >
            <div className="card-icon">🏆</div>
            <h3>Ranking</h3>
            <p>
              Consultar puntos y porcentaje de cumplimiento.
            </p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/incentivos')}
          >
            <div className="card-icon">🎁</div>
            <h3>Incentivos</h3>
            <p>
              Configurar premios y metas.
            </p>
          </div>

          <div
            className="dashboard-card"
            onClick={() => navigate('/admin/biblioteca')}
          >
            <div className="card-icon">📚</div>
            <h3>Biblioteca Digital</h3>
            <p>
              Gestionar libros y materiales de lectura.
            </p>
          </div>

        </div>

      </section>

    </main>
  )
}

export default AdminDashboard