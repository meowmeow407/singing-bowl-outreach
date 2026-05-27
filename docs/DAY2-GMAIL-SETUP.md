# Day 2 — Connect Gmail (Google OAuth)

## Goal

Click **Connect Gmail** in the app → sign in with Google → see **Connected as your@gmail.com**.

No email is sent today (that's Day 3).

---

## Step 1 — Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (e.g. `singing-bowl-outreach`)
3. **APIs & Services → Library** → search **Gmail API** → **Enable**
4. **APIs & Services → OAuth consent screen**
   - User type: **External** (for personal Gmail testing)
   - App name, your email as developer
   - Add scope: `.../auth/gmail.send` and `.../auth/userinfo.email`
   - **Test users:** add `kshyam0722@gmail.com` (your Gmail)

## Step 2 — OAuth Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `Singing Bowl Outreach Local`
4. **Authorized redirect URIs** — add exactly:

   ```
   http://localhost:5001/api/auth/google/callback
   ```

5. Copy **Client ID** and **Client secret**

## Step 3 — Backend `.env`

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
PORT=5001
```

**Never commit `.env` to GitHub.**

## Step 4 — Install packages & run

```powershell
cd backend
npm install googleapis dotenv
npm start
```

```powershell
cd frontend
npm run dev
```

Open http://localhost:3001 → **Connect Gmail** → choose your Google account → Allow.

You should return to the app with: **Connected as kshyam0722@gmail.com**

Tokens are saved in `data/gmail-tokens.json`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| OAuth not configured | Create `backend/.env` with client ID/secret |
| redirect_uri_mismatch | Redirect URI must match exactly in Google Console |
| Access blocked app not verified | Add your Gmail under **Test users** on consent screen |
| 404 on /api/auth/google | Backend not running on port 5001 |

## Day 2 done when

- [ ] Google Cloud project + Gmail API enabled
- [ ] OAuth client + redirect URI set
- [ ] `backend/.env` filled
- [ ] App shows **Connected** with your email
- [ ] `data/gmail-tokens.json` exists (do not share publicly)
