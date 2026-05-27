const fs = require('fs');
const path = require('path');
const emailService = require('./email');

const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'campaign-log.json');
const LEADS_PATH = path.join(__dirname, '..', '..', 'data', 'leads.json');
const PDF_PATH = path.join(__dirname, '..', '..', 'data', 'presentation.pdf');

const DELAY_MS = parseInt(process.env.CAMPAIGN_DELAY_MS || '4000', 10);
const MAX_PER_RUN = parseInt(process.env.CAMPAIGN_MAX_PER_RUN || '10', 10);

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeLog(entries) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2), 'utf8');
}

function personalize(text, lead) {
  const name = lead.contact_name || 'there';
  const company = lead.company_name || 'your company';
  return text
    .replace(/\[Name\]/g, name)
    .replace(/\[Company\]/g, company);
}

function formatBodyHtml(body) {
  if (body.includes('<br') || body.includes('<p>')) return body;
  return body.replace(/\n/g, '<br />');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runCampaign({ oauth2Client, leadIds, subject, body, skipAlreadySent }) {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error('Upload presentation.pdf first.');
  }

  const allLeads = readLeads();
  const selected = allLeads.filter((l) => leadIds.includes(l.id));
  if (selected.length === 0) {
    throw new Error('No valid leads selected.');
  }
  if (selected.length > MAX_PER_RUN) {
    throw new Error(`Maximum ${MAX_PER_RUN} leads per campaign run (safety limit).`);
  }

  const log = readLog();
  const sentEmails = new Set(
    log.filter((e) => e.status === 'sent').map((e) => e.email.toLowerCase())
  );

  const results = [];

  for (let i = 0; i < selected.length; i++) {
    const lead = selected[i];
    const entry = {
      id: 'camp_' + Date.now() + '_' + i,
      lead_id: lead.id,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      status: 'pending',
      timestamp: new Date().toISOString(),
      error: null,
    };

    if (skipAlreadySent && sentEmails.has(lead.email.toLowerCase())) {
      entry.status = 'skipped';
      entry.error = 'Already emailed in a previous campaign';
      log.unshift(entry);
      results.push(entry);
      continue;
    }

    try {
      const html = formatBodyHtml(personalize(body, lead));
      const subj = personalize(subject, lead);
      const sendResult = await emailService.sendGmailMessage(oauth2Client, {
        to: lead.email,
        subject: subj,
        htmlBody: html,
        attachmentPath: PDF_PATH,
        attachmentFilename: 'presentation.pdf',
      });

      entry.status = 'sent';
      entry.message_id = sendResult.id;
      sentEmails.add(lead.email.toLowerCase());

      const leads = readLeads();
      const idx = leads.findIndex((l) => l.id === lead.id);
      if (idx >= 0) {
        leads[idx].email_status = 'sent';
        leads[idx].last_emailed_at = entry.timestamp;
        writeLeads(leads);
      }
    } catch (e) {
      entry.status = 'failed';
      entry.error = e.message;
    }

    log.unshift(entry);
    results.push(entry);

    if (i < selected.length - 1 && entry.status === 'sent') {
      await sleep(DELAY_MS);
    }
  }

  writeLog(log.slice(0, 500));
  const summary = {
    total: results.length,
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };

  return { summary, results };
}

function exportLogCsv() {
  const log = readLog();
  const headers = ['timestamp', 'email', 'company_name', 'contact_name', 'status', 'error'];
  const rows = log.map((e) =>
    [e.timestamp, e.email, e.company_name, e.contact_name, e.status, e.error || '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  readLog,
  runCampaign,
  exportLogCsv,
  DELAY_MS,
  MAX_PER_RUN,
};
