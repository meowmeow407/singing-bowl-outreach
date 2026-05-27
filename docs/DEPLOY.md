# Deploy LeadOps Outreach Automator as a website

Deploy as **one website**: React UI + API on the same URL (recommended: **Render** free tier).

---

## Before you deploy

1. Push project to **GitHub** (private or public).
2. In [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** → your OAuth client:
   - Add **Authorized redirect URI** (you’ll get the URL after deploy):
     ```
     https://YOUR-APP-NAME.onrender.com/api/auth/google/callback
     ```
   - OAuth consent screen → **Test users** → add your Gmail.

---

## Option A — Render (easiest)

### 1. Create Web Service

1. Go to [render.com](https://render.com) → Sign up → **New +** → **Web Service**.
2. Connect your GitHub repo (`singing-bowl-outreach` folder as root, or monorepo path).
3. Settings:

| Field | Value |
|-------|--------|
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Root Directory** | (leave blank if repo root is the project) |

### 2. Environment variables

In Render → your service → **Environment**:

| Key | Example value |
|-----|----------------|
| `NODE_ENV` | `production` |
| `PUBLIC_URL` | `https://leadops-outreach.onrender.com` (your real URL) |
| `FRONTEND_URL` | same as `PUBLIC_URL` |
| `GOOGLE_REDIRECT_URI` | `https://leadops-outreach.onrender.com/api/auth/google/callback` |
| `GOOGLE_CLIENT_ID` | from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud |

Optional:

| Key | Default |
|-----|---------|
| `CAMPAIGN_MAX_PER_RUN` | `10` |
| `CAMPAIGN_DELAY_MS` | `4000` |

### 3. Deploy

Click **Deploy**. When finished, open your URL — you should see the app.

### 4. Test live

1. **Gmail Connection** → Connect → Allow.
2. Upload PDF → Send test email.
3. Import leads → Send campaign (use your own email in CSV for testing).

---

## Option B — Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub.
2. Set **Start Command**: `npm start`
3. Set **Build Command**: `npm run build`
4. Add the same environment variables as Render.
5. Generate a public domain in Railway settings → use that URL in Google OAuth.

---

## How production works

```text
Browser  →  https://your-app.onrender.com
              ├── /           → React app (frontend/dist)
              └── /api/*      → Express API + Gmail
```

Locally you use two ports (3001 + 5001). Online, **one URL** serves both.

---

## Important limitations (free hosting)

| Topic | Note |
|-------|------|
| **Data storage** | `data/leads.json`, tokens, PDF are on the server disk. On free Render, data may **reset** when the service redeploys or sleeps. |
| **Sleep** | Free tier sleeps after ~15 min idle; first visit may take 30–60s to wake. |
| **HTTPS** | Required for Google OAuth — Render provides HTTPS automatically. |
| **Each user’s Gmail** | Whoever opens the site must click **Connect Gmail** on that deployment. |

For persistent data later: paid disk on Render, or move `data/` to a database (MongoDB/Postgres).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Check build logs; ensure `npm run build` created `frontend/dist`. |
| `redirect_uri_mismatch` | `GOOGLE_REDIRECT_URI` must match Google Console **exactly**. |
| `403 access_denied` | Add your Gmail under OAuth **Test users**. |
| Gmail works locally but not online | Update redirect URI + `PUBLIC_URL` to production URL. |

---

## Custom domain (optional)

Render → Settings → Custom Domains → add `outreach.yourdomain.com`.

Then update:

- `PUBLIC_URL` / `FRONTEND_URL`
- `GOOGLE_REDIRECT_URI`
- Google OAuth redirect URI list
