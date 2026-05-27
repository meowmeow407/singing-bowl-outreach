# Day 4 — Bulk campaign + export log

## Goal

Send your presentation to **multiple selected leads** (not just a test email to yourself), track results, and export a CSV log.

## Prerequisites

- [x] Day 1: Leads imported
- [x] Day 2: Gmail connected
- [x] Day 3: PDF uploaded + test email works

## How to use

1. **Safe test:** Edit CSV so lead emails are **your own** (or 2 test addresses you control).
2. In the **Leads** table, check the leads to email (or header checkbox = select all).
3. Scroll to **Day 4 — Send campaign to leads**.
4. Click **Send to N selected** → confirm.
5. Watch **Campaign send log** (sent / failed / skipped).
6. Click **Export log CSV** for your client report.

## Limits (safety)

- Max **10 leads per run** (change in `backend/.env`: `CAMPAIGN_MAX_PER_RUN=10`)
- **4 seconds** delay between each send (`CAMPAIGN_DELAY_MS=4000`)
- Option: **Skip leads already emailed** in a previous run

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/email/send-campaign` | Send to selected `leadIds` |
| GET | `/api/email/campaign-log` | List send history |
| GET | `/api/email/campaign-log/export` | Download CSV |

## Files added

- `backend/services/campaign.js` — personalize, send loop, log
- `data/campaign-log.json` — send history
- `frontend/src/components/CampaignPanel.jsx` — UI

## Day 4 done when

- [ ] Selected 2+ leads and campaign completed
- [ ] Log shows `sent` rows
- [ ] Leads table shows **emailed** status
- [ ] Exported `campaign-log.csv`
