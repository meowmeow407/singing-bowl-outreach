require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const gmailAuthRoutes = require('./routes/gmailAuth');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 5001;
const LEADS_FILE = path.join(__dirname, '..', 'data', 'leads.json');
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

app.use(
  cors({
    origin: isProd
      ? process.env.PUBLIC_URL || process.env.FRONTEND_URL || true
      : true,
  })
);
app.use(express.json());

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

// --- Gmail OAuth (Day 2) ---
app.use('/api/auth', gmailAuthRoutes);
app.get('/api/gmail/status', async (req, res) => {
  const gmailAuth = require('./services/gmailAuth');
  res.json(await gmailAuth.getStatus());
});
app.post('/api/gmail/disconnect', (req, res) => {
  const gmailAuth = require('./services/gmailAuth');
  gmailAuth.deleteTokens();
  res.json({ message: 'Gmail disconnected' });
});

// --- Email & Presentation (Day 3) ---
app.use('/api/email', emailRoutes);

// --- Leads (Day 1) ---
app.get('/api/leads', (req, res) => {
  res.json(readLeads());
});

// Day 5 — Export leads as CSV
app.get('/api/leads/export', (req, res) => {
  const leads = readLeads();
  const headers = ['company_name', 'contact_name', 'email', 'phone', 'source', 'notes', 'email_status', 'last_emailed_at'];
  const rows = leads.map((l) =>
    headers
      .map((h) => `\"${String(l[h] ?? '').replace(/\"/g, '\"\"')}\"`)
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
  res.send(csv);
});

app.post('/api/leads/import', (req, res) => {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'csvText required' });

  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\r/g, ''));

  const leads = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/\r/g, ''));
    if (cols.length < 3) continue;
    const row = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] || ''));
    if (!row.email || !row.email.includes('@')) continue;

    leads.push({
      id: 'lead_' + Date.now() + '_' + i,
      company_name: row.company_name || row.company || '',
      contact_name: row.contact_name || row.name || '',
      email: row.email,
      phone: row.phone || '',
      source: row.source || 'CSV',
      notes: row.notes || '',
      created_at: new Date().toISOString(),
    });
  }

  const existing = readLeads();
  const emails = new Set(existing.map((l) => l.email.toLowerCase()));
  const merged = [...existing];
  let added = 0;
  for (const lead of leads) {
    if (!emails.has(lead.email.toLowerCase())) {
      merged.push(lead);
      emails.add(lead.email.toLowerCase());
      added++;
    }
  }
  writeLeads(merged);
  res.json({ message: `Added ${added} leads`, total: merged.length });
});

// Production: serve React build from same server (one public URL)
if (isProd) {
  if (!fs.existsSync(FRONTEND_DIST)) {
    console.warn('Warning: frontend/dist not found. Run: npm run build (from project root)');
  } else {
    app.use(express.static(FRONTEND_DIST));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  }
}

app.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL;
  console.log(`Server listening on port ${PORT}`);
  if (isProd && publicUrl) {
    console.log(`Live site: ${publicUrl}`);
  } else if (!isProd) {
    console.log(`Local API: http://localhost:${PORT}`);
    console.log(`Local UI:  http://localhost:3001 (npm run dev:frontend)`);
  }
  const configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  console.log(`Gmail OAuth: ${configured ? 'configured' : 'NOT configured — see docs/DEPLOY.md'}`);
});
