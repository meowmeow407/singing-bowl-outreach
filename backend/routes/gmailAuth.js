const express = require('express');
const gmailAuth = require('../services/gmailAuth');

const router = express.Router();
function getAppUrl() {
  return (
    process.env.PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')
  );
}

router.get('/google', (req, res) => {
  try {
    const url = gmailAuth.getAuthUrl();
    res.redirect(url);
  } catch (e) {
    res.status(500).json({
      error: e.message,
      hint: 'Copy backend/.env.example to backend/.env and add Google OAuth credentials',
    });
  }
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${getAppUrl()}?gmail=error&message=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${getAppUrl()}?gmail=error&message=missing_code`);
  }
  try {
    await gmailAuth.handleCallback(code);
    res.redirect(`${getAppUrl()}?gmail=connected`);
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.redirect(`${getAppUrl()}?gmail=error&message=${encodeURIComponent(e.message)}`);
  }
});

router.get('/status', async (req, res) => {
  const status = await gmailAuth.getStatus();
  res.json(status);
});

router.post('/disconnect', (req, res) => {
  gmailAuth.deleteTokens();
  res.json({ message: 'Gmail disconnected' });
});

module.exports = router;
