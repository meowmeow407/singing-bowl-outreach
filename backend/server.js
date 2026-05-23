const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5001;
const LEADS_FILE = path.join(__dirname, '..', 'data', 'leads.json');

app.use(cors());
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

// GET all leads
app.get('/api/leads', (req, res) => {
  res.json(readLeads());
});

// POST import CSV (raw text in body for Day 1 simplicity)
app.post('/api/leads/import', (req, res) => {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'csvText required' });

  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const leads = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
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

app.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`));