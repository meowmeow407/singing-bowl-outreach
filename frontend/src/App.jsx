import { useState, useEffect } from 'react';

export default function App() {
  const [leads, setLeads] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [msg, setMsg] = useState('');

  const fetchLeads = async () => {
    const res = await fetch('/api/leads');
    const data = await res.json();
    setLeads(data);
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const res = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setCsvText('');
    fetchLeads();
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Singing Bowl — Buyer Leads</h1>
      <p>Day 1: Import CSV of buyers (emails from research)</p>

      <input type="file" accept=".csv" onChange={handleFile} />
      <button onClick={handleImport} disabled={!csvText} style={{ marginLeft: 8 }}>
        Import CSV
      </button>
      {msg && <p style={{ color: 'green' }}>{msg}</p>}

      <p><strong>{leads.length}</strong> leads in database</p>

      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Company</th><th>Contact</th><th>Email</th><th>Source</th><th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{l.company_name}</td>
              <td>{l.contact_name}</td>
              <td>{l.email}</td>
              <td>{l.source}</td>
              <td>{l.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}