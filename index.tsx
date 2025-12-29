
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("App Territórios: Inicializando PWA...");

// Registro do Service Worker simplificado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Caminho relativo simples funciona melhor em sandboxes
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => console.log('PWA Service Worker Ativo:', reg.scope))
      .catch(err => console.error('Erro ao registrar SW:', err));
  });
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ef4444' }}>Ocorreu um erro de carregamento</h2>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Recarregar App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
