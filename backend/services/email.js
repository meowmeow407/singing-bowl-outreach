const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Encodes a string or buffer into URL-safe base64 format (RFC 4648)
 */
function toBase64Url(strOrBuffer) {
  const buffer = Buffer.isBuffer(strOrBuffer) ? strOrBuffer : Buffer.from(strOrBuffer, 'utf8');
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email with an attachment using the Gmail API
 */
async function sendGmailMessage(authClient, { to, subject, htmlBody, attachmentPath, attachmentFilename }) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });

  const boundary = "singing_bowl_outreach_boundary_" + Date.now();
  const headerLines = [
    `From: me`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
  ];

  // Convert line breaks to HTML breaks in body if needed (we assume htmlBody is already formatted HTML)
  const bodyLines = [
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
  ];

  const attachmentLines = [];
  if (attachmentPath && fs.existsSync(attachmentPath)) {
    const fileContent = fs.readFileSync(attachmentPath);
    const base64File = fileContent.toString('base64');
    
    // Chunk base64 to maximum 76 characters per line for standard MIME parsing
    const base64Chunks = base64File.match(/.{1,76}/g) || [];
    const filename = attachmentFilename || 'presentation.pdf';

    attachmentLines.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ...base64Chunks,
      ``
    );
  }

  const footerLines = [
    `--${boundary}--`
  ];

  const fullMime = [...headerLines, ...bodyLines, ...attachmentLines, ...footerLines].join('\r\n');
  const raw = toBase64Url(Buffer.from(fullMime, 'utf8'));

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: raw
    }
  });

  return response.data;
}

module.exports = {
  sendGmailMessage
};
