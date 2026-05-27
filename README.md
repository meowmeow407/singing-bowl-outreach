# LeadOps Outreach Automator

Lead list + Gmail sending tool for the **API 3 (EXPORT)** workflow:

- Day 1: Import buyer leads (CSV)
- Day 2: Connect Gmail (Google OAuth)
- Day 3: Upload `presentation.pdf` + send a test email
- Day 4: Bulk campaign send + campaign log + export
- Day 5: Search/filter + export leads

## Run locally

### Backend (port 5001)

```powershell
cd backend
npm install
copy .env.example .env
npm start
```

### Frontend (port 3001)

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3001`.

## Deploy as a website

See **`docs/DEPLOY.md`** (Render / Railway, Google OAuth production URLs).

Quick production build (single server):

```powershell
npm run build
cd backend
set NODE_ENV=production
set PUBLIC_URL=https://your-domain.com
npm start
```

## Gmail setup (Day 2)

Follow `docs/DAY2-GMAIL-SETUP.md`.

**Important:** add your Gmail as a **Test user** in Google OAuth consent screen to avoid `403 access_denied`.

## Testing safely

For demos, set lead emails to **your own email(s)** so you don't spam strangers.

## Useful endpoints

- Leads
  - `GET /api/leads`
  - `POST /api/leads/import`
  - `GET /api/leads/export`
- Gmail
  - `GET /api/gmail/status`
  - `POST /api/gmail/disconnect`
- Email
  - `POST /api/email/upload-presentation`
  - `GET /api/email/presentation-status`
  - `POST /api/email/send-test`
  - `POST /api/email/send-campaign`
  - `GET /api/email/campaign-log`
  - `GET /api/email/campaign-log/export`

## Docs

- `docs/DEPLOY.md` — **deploy online**
- `docs/DAY2-GMAIL-SETUP.md`
- `docs/DAY4-CAMPAIGN.md`
- `docs/DAY5-POLISH.md`
- `docs/DAY6-SUBMISSION.md`
- `docs/DAY7-FINAL.md`

