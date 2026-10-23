import { Routes, Route, NavLink } from 'react-router-dom';
import { DocumentsPage } from './components/DocumentsPage';
import { DocumentDetailPage } from './components/DocumentDetailPage';
import { useHealth } from './hooks/useApi';

function Navigation() {
  const { healthy, loading } = useHealth();

  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
        Documents
      </NavLink>
      <span style={{ marginLeft: 'auto', padding: '8px 12px', fontSize: '14px', color: '#6b7280' }}>
        {loading ? (
          <span className="spinner" style={{ width: '16px', height: '16px', display: 'inline-block' }} />
        ) : healthy ? (
          <span className="badge badge-success">API Healthy</span>
        ) : (
          <span className="badge badge-danger">API Unhealthy</span>
        )}
      </span>
    </nav>
  );
}

function App() {
  return (
    <div>
      <Navigation />
      <main className="container" role="main">
        <Routes>
          <Route path="/" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;