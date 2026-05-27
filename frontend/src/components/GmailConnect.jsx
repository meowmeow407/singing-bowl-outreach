import { useState, useEffect } from 'react';

export default function GmailConnect() {
  const [status, setStatus] = useState({
    connected: false,
    email: null,
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/gmail/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get('gmail');
    if (gmail === 'connected') {
      setBanner('Gmail connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      fetchStatus();
    } else if (gmail === 'error') {
      setBanner('Gmail connection failed: ' + (params.get('message') || 'unknown'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    await fetch('/api/gmail/disconnect', { method: 'POST' });
    setBanner('Gmail disconnected.');
    fetchStatus();
  };

  if (loading) {
    return <p style={styles.muted}>Checking Gmail connection…</p>;
  }

  return (
    <section style={styles.card}>
      <h2 style={styles.h2}>Gmail Connection</h2>
      <p style={styles.muted}>
        Connect your Gmail with Google OAuth (safe — no password stored). Required before sending emails.
      </p>

      {banner && (
        <p style={banner.includes('failed') ? styles.error : styles.success}>{banner}</p>
      )}

      {!status.configured && (
        <div style={styles.warn}>
          <strong>OAuth not configured.</strong> Add <code>GOOGLE_CLIENT_ID</code> and{' '}
          <code>GOOGLE_CLIENT_SECRET</code> to <code>backend/.env</code>. See{' '}
          <code>docs/DAY2-GMAIL-SETUP.md</code>.
        </div>
      )}

      {status.connected ? (
        <div style={styles.connected}>
          <span style={styles.dot} />
          <div>
            <strong>Connected</strong>
            <div style={styles.email}>{status.email}</div>
            {status.connected_at && (
              <div style={styles.small}>Since {new Date(status.connected_at).toLocaleString()}</div>
            )}
          </div>
          <button type="button" onClick={handleDisconnect} style={styles.disconnectBtn}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={!status.configured}
          style={styles.connectBtn}
        >
          Connect Gmail
        </button>
      )}

      {status.error && <p style={styles.error}>{status.error}</p>}
    </section>
  );
}

const styles = {
  card: {
    background: '#1e1e2e',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  h2: { margin: '0 0 8px', fontSize: 18 },
  muted: { color: '#aaa', fontSize: 14, marginBottom: 16 },
  success: { color: '#4ade80', marginBottom: 12 },
  error: { color: '#f87171', marginBottom: 12 },
  warn: {
    background: '#422006',
    color: '#fcd34d',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  connected: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#4ade80',
    flexShrink: 0,
  },
  email: { fontSize: 15, marginTop: 4 },
  small: { fontSize: 12, color: '#888', marginTop: 4 },
  connectBtn: {
    background: '#4285f4',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
  disconnectBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    color: '#f87171',
    border: '1px solid #f87171',
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
