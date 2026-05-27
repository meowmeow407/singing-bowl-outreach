const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const gmailAuth = require('../services/gmailAuth');
const emailService = require('../services/email');
const campaignService = require('../services/campaign');
const presentations = require('../services/presentations');

const router = express.Router();
const DATA_DIR = presentations.DATA_DIR;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATA_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, presentations.buildStoredFilename(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Endpoint to upload the presentation
router.post('/upload-presentation', upload.single('presentation'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file is not a PDF' });
  }
  const { item } = presentations.addPresentation(req.file);
  const status = presentations.getStatus();
  res.json({
    message: 'Presentation PDF uploaded successfully',
    uploadedFile: item,
    ...status
  });
}, (error, req, res, next) => {
  // Catch multer / filter errors and return 400
  res.status(400).json({ error: error.message });
});

// Endpoint to get presentation upload status
router.get('/presentation-status', (req, res) => {
  try {
    res.json(presentations.getStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/presentation/active', (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });
  const result = presentations.setActive(filename);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json({ message: 'Active PDF updated', ...presentations.getStatus() });
});

router.delete('/presentation/:filename', (req, res) => {
  const result = presentations.removePresentation(req.params.filename);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json({ message: 'PDF removed', ...presentations.getStatus() });
});

// Endpoint to send test email to self
router.post('/send-test', async (req, res) => {
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required' });
  }

  const oauth2Client = gmailAuth.getAuthorizedClient();
  if (!oauth2Client) {
    return res.status(401).json({ error: 'Gmail is not connected. Please connect Gmail first.' });
  }

  // Get recipient email (own email)
  const status = await gmailAuth.getStatus();
  if (!status.connected || !status.email) {
    return res.status(401).json({ error: 'Gmail is not connected or session expired.' });
  }
  const myEmail = status.email;

  const activePresentation = presentations.getActivePresentation();
  if (!activePresentation) {
    return res.status(400).json({ error: 'No active PDF found. Upload and set one active first.' });
  }

  try {
    const result = await emailService.sendGmailMessage(oauth2Client, {
      to: myEmail,
      subject: subject,
      htmlBody: body,
      attachmentPath: activePresentation.path,
      attachmentFilename: activePresentation.filename,
    });

    res.json({
      success: true,
      message: 'Test email sent successfully to ' + myEmail,
      messageId: result.id,
      recipient: myEmail
    });
  } catch (e) {
    console.error('Failed to send test email:', e);
    res.status(500).json({ error: e.message });
  }
});

// Day 4 — Send campaign to selected leads
router.post('/send-campaign', async (req, res) => {
  const { leadIds, subject, body, skipAlreadySent = true } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one lead.' });
  }
  if (!subject || !body) {
    return res.status(400).json({ error: 'Subject and body are required.' });
  }

  const oauth2Client = gmailAuth.getAuthorizedClient();
  if (!oauth2Client) {
    return res.status(401).json({ error: 'Gmail is not connected.' });
  }

  try {
    const activePresentation = presentations.getActivePresentation();
    if (!activePresentation) {
      return res.status(400).json({ error: 'No active PDF found. Upload and set one active first.' });
    }
    const result = await campaignService.runCampaign({
      oauth2Client,
      leadIds,
      subject,
      body,
      skipAlreadySent,
      attachmentPath: activePresentation.path,
      attachmentFilename: activePresentation.filename,
    });
    res.json({
      message: `Campaign finished: ${result.summary.sent} sent, ${result.summary.failed} failed, ${result.summary.skipped} skipped`,
      ...result,
    });
  } catch (e) {
    console.error('Campaign error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/campaign-log', (req, res) => {
  res.json(campaignService.readLog());
});

router.get('/campaign-log/export', (req, res) => {
  const csv = campaignService.exportLogCsv();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=campaign-log.csv');
  res.send(csv);
});

module.exports = router;
