const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, '..', '..', 'data', 'gmail-tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
}

function deleteTokens() {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch {
    /* ignore */
  }
}

function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

async function handleCallback(code) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth not configured');
  }
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  const stored = {
    ...tokens,
    email: data.email,
    connected_at: new Date().toISOString(),
  };
  writeTokens(stored);
  return stored;
}

async function getStatus() {
  const tokens = readTokens();
  if (!tokens || !tokens.access_token) {
    return { connected: false, email: null, configured: !!getOAuth2Client() };
  }

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    return { connected: false, email: tokens.email || null, configured: false };
  }

  oauth2Client.setCredentials(tokens);

  try {
    if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const updated = { ...tokens, ...credentials, email: tokens.email };
      writeTokens(updated);
      oauth2Client.setCredentials(updated);
    }
    return {
      connected: true,
      email: tokens.email,
      connected_at: tokens.connected_at,
      configured: true,
    };
  } catch (e) {
    return {
      connected: false,
      email: tokens.email,
      configured: true,
      error: 'Session expired — connect Gmail again',
    };
  }
}

function getAuthorizedClient() {
  const tokens = readTokens();
  const oauth2Client = getOAuth2Client();
  if (!tokens || !oauth2Client) return null;
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

module.exports = {
  getAuthUrl,
  handleCallback,
  getStatus,
  getAuthorizedClient,
  deleteTokens,
  readTokens,
};
