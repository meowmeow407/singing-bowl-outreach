import { useState, useEffect } from 'react';

export default function CampaignPanel({
  leads,
  gmailConnected,
  pdfUploaded,
  subject,
  body,
  selectedIds,
  onSelectionChange,
  onCampaignComplete,
}) {
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [skipSent, setSkipSent] = useState(true);

  const fetchLog = async () => {
    try {
      const res = await fetch('/api/email/campaign-log');
      if (res.ok) setLog(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLog();
  }, []);

  const handleSendCampaign = async () => {
    if (!gmailConnected) {
      setErr('Connect Gmail first.');
      return;
    }
    if (!pdfUploaded) {
      setErr('Upload presentation PDF first.');
      return;
    }
    if (selectedIds.length === 0) {
      setErr('Select at least one lead.');
      return;
    }
    if (
      !window.confirm(
        `Send presentation to ${selectedIds.length} lead(s)? Use test emails only unless you have permission.`
      )
    ) {
      return;
    }

    setSending(true);
    setMsg('');
    setErr('');

    try {
      const res = await fetch('/api/email/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedIds,
          subject,
          body,
          skipAlreadySent: skipSent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message);
        fetchLog();
        onSelectionChange([]);
        if (onCampaignComplete) onCampaignComplete();
      } else {
        setErr(data.error || 'Campaign failed');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleExportLog = () => {
    window.open('/api/email/campaign-log/export', '_blank');
  };

  return (
    <section className="panel-card">
      <h2 className="card-title">
        <span>🚀</span> Send Campaign
      </h2>
      <p className="card-description">
        Select leads below, then send your template + PDF to each (4 second delay between emails to avoid spam
        flags). Max 10 per run.
      </p>

      {msg && <div className="alert-banner success">{msg}</div>}
      {err && <div className="alert-banner error">{err}</div>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13 }}>
        <input type="checkbox" checked={skipSent} onChange={(e) => setSkipSent(e.target.checked)} />
        Skip leads already emailed in a past campaign
      </label>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSendCampaign}
          disabled={sending || !gmailConnected || !pdfUploaded || selectedIds.length === 0}
        >
          {sending ? `Sending… (${selectedIds.length} leads)` : `Send to ${selectedIds.length} selected`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleExportLog}>
          Export log CSV
        </button>
        <button type="button" className="btn btn-secondary" onClick={fetchLog}>
          Refresh log
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8 }}>
        Selected: <strong>{selectedIds.length}</strong> / {leads.length} leads
      </p>

      <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Campaign send log</h3>
      {log.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text)' }}>No campaign sends yet.</p>
      ) : (
        <div className="leads-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Email</th>
                <th>Company</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {log.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>
                    <code>{row.email}</code>
                  </td>
                  <td>{row.company_name}</td>
                  <td>
                    <span className={`status-pill status-${row.status}`}>{row.status}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{row.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text)', marginTop: 12 }}>
        Tip: For demo, put your own email in CSV rows. Only email real businesses with permission.
      </p>
    </section>
  );
}
