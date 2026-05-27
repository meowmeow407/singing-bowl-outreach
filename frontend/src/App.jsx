import { useState, useEffect } from 'react';
import GmailConnect from './components/GmailConnect.jsx';
import CampaignPanel from './components/CampaignPanel.jsx';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('campaign'); // campaign | leads

  // Leads states
  const [leads, setLeads] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [leadQuery, setLeadQuery] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all'); // all | new | emailed

  // Gmail states
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });

  // PDF states
  const [pdfStatus, setPdfStatus] = useState({ uploaded: false, filename: '', sizeBytes: 0, uploadedAt: '' });
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Email Template states
  const [subject, setSubject] = useState('Wholesale Singing Bowls - Catalog & Pricing for [Company]');
  const [body, setBody] = useState(
    "Hello [Name],\n\nHope you're having a wonderful day.\n\nWe love what you're doing at [Company]. As a premium supplier of authentic hand-hammered Himalayan singing bowls, we would love to partner with you.\n\nI have attached our catalog and wholesale pricing brochure (presentation.pdf) for your review. All of our bowls are sourced directly from artisan families in Nepal and tested for sound purity.\n\nLooking forward to hearing your thoughts!\n\nBest regards,\nSinging Bowl Team"
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [testEmailError, setTestEmailError] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Fetch leads from database
  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      console.error('Error fetching leads:', e);
    }
  };

  // Fetch Gmail OAuth connection status
  const fetchGmailStatus = async () => {
    try {
      const res = await fetch('/api/gmail/status');
      const data = await res.json();
      setGmailStatus(data);
    } catch (e) {
      console.error('Error fetching Gmail status:', e);
    }
  };

  // Fetch saved PDF status from backend
  const fetchPdfStatus = async () => {
    try {
      const res = await fetch('/api/email/presentation-status');
      const data = await res.json();
      setPdfStatus(data);
    } catch (e) {
      console.error('Error fetching PDF status:', e);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchGmailStatus();
    fetchPdfStatus();

    // Check if redirect returned with connection status
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      fetchGmailStatus();
    }
  }, []);

  // CSV Lead Import handlers
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImportMsg('');
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      setImportMsg(data.message || data.error);
      setCsvText('');
      fetchLeads();
    } catch (err) {
      setImportMsg('Import failed: ' + err.message);
    }
  };

  // PDF File Upload Handler
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setTestEmailError('Invalid file type: Please select a PDF file.');
      return;
    }

    setUploadingPdf(true);
    setTestEmailMsg('');
    setTestEmailError('');

    const formData = new FormData();
    formData.append('presentation', file);

    try {
      const res = await fetch('/api/email/upload-presentation', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailMsg(data.message || 'PDF uploaded successfully.');
        fetchPdfStatus();
      } else {
        setTestEmailError(data.error || 'Failed to upload PDF.');
      }
    } catch (err) {
      setTestEmailError('Error uploading file: ' + err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  // Send test email to self handler
  const handleSendTest = async () => {
    if (!gmailStatus.connected) {
      setTestEmailError('Please connect your Gmail account first.');
      return;
    }
    if (!pdfStatus.uploaded) {
      setTestEmailError('Please upload your presentation.pdf catalog first.');
      return;
    }

    setSendingTest(true);
    setTestEmailMsg('');
    setTestEmailError('');

    try {
      const res = await fetch('/api/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body: body.replace(/\n/g, '<br />'), // Format linebreaks for HTML content-type
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailMsg(data.message || 'Test email sent successfully!');
      } else {
        setTestEmailError(data.error || 'Failed to send test email.');
      }
    } catch (err) {
      setTestEmailError('Error sending test email: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  // Formatting placeholders in Live Preview panel
  const previewSubject = subject
    .replace('[Company]', 'Zen Harmony Studio')
    .replace('[Name]', 'Priya Sharma');
  
  const previewBody = body
    .replace('[Company]', '<strong>Zen Harmony Studio</strong>')
    .replace('[Name]', '<strong>Priya Sharma</strong>')
    .replace(/\n/g, '<br />');

  const normalizedQuery = leadQuery.trim().toLowerCase();
  const filteredLeads = leads.filter((l) => {
    const matchesQuery =
      !normalizedQuery ||
      (l.company_name || '').toLowerCase().includes(normalizedQuery) ||
      (l.contact_name || '').toLowerCase().includes(normalizedQuery) ||
      (l.email || '').toLowerCase().includes(normalizedQuery) ||
      (l.source || '').toLowerCase().includes(normalizedQuery) ||
      (l.notes || '').toLowerCase().includes(normalizedQuery);

    const status = l.email_status === 'sent' ? 'emailed' : 'new';
    const matchesStatus =
      leadStatusFilter === 'all' ||
      (leadStatusFilter === 'new' && status === 'new') ||
      (leadStatusFilter === 'emailed' && status === 'emailed');

    return matchesQuery && matchesStatus;
  });

  const exportLeadsCsv = () => {
    window.open('/api/leads/export', '_blank');
  };

  return (
    <div className="dashboard-container">
      <header className="header-section">
        <h1 className="main-title">Singing Bowl Outreach</h1>
        <p className="subtitle">
          Leads · Gmail · PDF catalog · Campaign send · Exports
        </p>

        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'campaign' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaign')}
          >
            Campaign
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            Leads
          </button>
        </div>
      </header>

      {activeTab === 'campaign' && (
        <div className="dashboard-grid">
          {/* Left Side: Campaign Management Controls */}
          <div>
            {/* Gmail OAuth Status */}
            <GmailConnect />

            {/* PDF Catalog Presentation Upload Card */}
            <section className="panel-card">
              <h2 className="card-title">
                <span>📄</span> PDF Catalog Upload
              </h2>
              <p className="card-description">
                Upload your outreach materials (PDF format, max 10MB). This catalog will be attached to your sales pitches.
              </p>

              <div className="upload-zone" onClick={() => document.getElementById('pdf-file-input').click()}>
                <input
                  type="file"
                  id="pdf-file-input"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  style={{ display: 'none' }}
                />
                <p className="upload-zone-text">
                  {uploadingPdf ? 'Uploading to server...' : 'Drag & drop or click to choose presentation.pdf'}
                </p>
                
                {pdfStatus.uploaded ? (
                  <div className="upload-status-badge success">
                    ✓ Active: {pdfStatus.filename} ({(pdfStatus.sizeBytes / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <div className="upload-status-badge">
                    ⚠ No file uploaded
                  </div>
                )}
              </div>
              {pdfStatus.uploaded && (
                <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 8 }}>
                  Last uploaded: {new Date(pdfStatus.uploadedAt).toLocaleString()}
                </p>
              )}
            </section>

            {/* Email Template Builder Card */}
            <section className="panel-card">
              <h2 className="card-title">
                <span>✉</span> Compose Outreach Template
              </h2>
              <p className="card-description">
                Design the email template sent to leads. You can use dynamic placeholders: 
                <code> [Name]</code> and <code> [Company]</code>.
              </p>

              {testEmailMsg && <div className="alert-banner success">{testEmailMsg}</div>}
              {testEmailError && <div className="alert-banner error">{testEmailError}</div>}

              <div className="form-group">
                <label className="form-label">Subject Line</label>
                <input
                  type="text"
                  className="input-text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body (HTML / Plaintext)</label>
                <textarea
                  className="textarea-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email pitch here..."
                />
              </div>

              <button
                onClick={handleSendTest}
                disabled={sendingTest || !gmailStatus.connected || !pdfStatus.uploaded}
                className="btn btn-primary"
                style={{ width: '100%', gap: 8 }}
              >
                {sendingTest ? 'Sending Test Email...' : 'Send Test Email (to yourself)'}
              </button>
              
              {(!gmailStatus.connected || !pdfStatus.uploaded) && (
                <p style={{ color: 'var(--text)', fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                  {!gmailStatus.connected ? '🔌 Connect Gmail' : ''} 
                  {!gmailStatus.connected && !pdfStatus.uploaded ? ' and ' : ''}
                  {!pdfStatus.uploaded ? '📄 Upload presentation.pdf' : ''} 
                  {' to unlock sending.'}
                </p>
              )}
            </section>

            <CampaignPanel
              leads={leads}
              gmailConnected={gmailStatus.connected}
              pdfUploaded={pdfStatus.uploaded}
              subject={subject}
              body={body}
              selectedIds={selectedLeadIds}
              onSelectionChange={setSelectedLeadIds}
              onCampaignComplete={fetchLeads}
            />
          </div>

          {/* Right Side: Live Email Preview */}
          <div>
            <div style={{ position: 'sticky', top: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👁</span> Live Campaign Preview
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
                This is how your first email pitch will look, rendered with a sample lead (<strong>Priya Sharma</strong> from <strong>Zen Harmony Studio</strong>).
              </p>

              <div className="email-preview-container">
                <div className="email-preview-header">
                  <div className="window-dot red" />
                  <div className="window-dot yellow" />
                  <div className="window-dot green" />
                  <span className="email-preview-title">outreach-composer.dmg</span>
                </div>
                
                <div className="email-preview-fields">
                  <div className="email-preview-field">
                    <strong>From:</strong> {gmailStatus.email ? `${gmailStatus.email} (You)` : 'Not Connected'}
                  </div>
                  <div className="email-preview-field">
                    <strong>To:</strong> priya@zenharmonystudio.com
                  </div>
                  <div className="email-preview-field">
                    <strong>Subject:</strong> {previewSubject || '(No Subject)'}
                  </div>
                  {pdfStatus.uploaded ? (
                    <div className="email-preview-attachment-badge">
                      📎 {pdfStatus.filename} ({(pdfStatus.sizeBytes / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                      ⚠ PDF Attachment Missing
                    </div>
                  )}
                </div>

                <div 
                  className="email-preview-body"
                  dangerouslySetInnerHTML={{ __html: previewBody || '<em>Email body is empty...</em>' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <>
          {/* Import/Export */}
          <section className="panel-card">
            <h2 className="card-title">
              <span>📥</span> Import / Export
            </h2>
            <p className="card-description">
              Upload a CSV with columns like <code>company_name</code>, <code>contact_name</code>, <code>email</code>.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept=".csv" onChange={handleFile} />
              <button onClick={handleImport} disabled={!csvText} className="btn btn-secondary">
                Import CSV
              </button>
              <button type="button" className="btn btn-secondary" onClick={exportLeadsCsv} disabled={leads.length === 0}>
                Export leads CSV
              </button>
              <button type="button" className="btn btn-secondary" onClick={fetchLeads}>
                Refresh leads
              </button>
            </div>

            {importMsg && (
              <p style={{ color: importMsg.includes('Added') ? '#22c55e' : '#ef4444', fontSize: 14, marginTop: 10 }}>
                {importMsg}
              </p>
            )}
          </section>

          {/* Leads Table */}
          <section className="panel-card">
            <h2 className="card-title">
              <span>👥</span> Leads ({filteredLeads.length})
            </h2>
            <p className="card-description">
              Search/filter leads and select them for campaign sending (selection is shared across tabs).
            </p>

            <div className="lead-filters">
              <input
                className="input-text"
                placeholder="Search leads (company, email, source…)…"
                value={leadQuery}
                onChange={(e) => setLeadQuery(e.target.value)}
              />
              <select
                className="input-text"
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="emailed">Emailed</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setLeadQuery('');
                  setLeadStatusFilter('all');
                }}
              >
                Clear
              </button>
            </div>

            {filteredLeads.length > 0 ? (
              <div className="leads-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                          onChange={() => {
                            if (selectedLeadIds.length === filteredLeads.length) {
                              setSelectedLeadIds([]);
                            } else {
                              setSelectedLeadIds(filteredLeads.map((l) => l.id));
                            }
                          }}
                          title="Select all"
                        />
                      </th>
                      <th>Company Name</th>
                      <th>Contact Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(l.id)}
                            onChange={() => {
                              if (selectedLeadIds.includes(l.id)) {
                                setSelectedLeadIds(selectedLeadIds.filter((id) => id !== l.id));
                              } else {
                                setSelectedLeadIds([...selectedLeadIds, l.id]);
                              }
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{l.company_name}</td>
                        <td>{l.contact_name}</td>
                        <td><code>{l.email}</code></td>
                        <td>
                          {l.email_status === 'sent' ? (
                            <span className="status-pill status-sent">emailed</span>
                          ) : (
                            <span className="status-pill status-pending">new</span>
                          )}
                        </td>
                        <td><span className="source-badge">{l.source}</span></td>
                        <td>{l.notes || <em style={{ color: '#aaa' }}>none</em>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text)', padding: '24px 0' }}>
                No leads found. Try importing a CSV.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}