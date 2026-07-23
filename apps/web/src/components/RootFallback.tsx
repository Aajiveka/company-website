/**
 * Last-resort error fallback — rendered when providers or the router itself crash.
 * Uses inline styles since Tailwind CSS may not be available at this point.
 */
export function RootFallback() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center', padding: '1rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000b33' }}>Something went wrong</h1>
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>The application encountered an unexpected error.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', backgroundColor: '#005985', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
