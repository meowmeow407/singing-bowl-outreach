## Day 5 — UI polish & exports

### What was added

- **Lead search + status filter**: quickly find leads by company/email/source and filter `new` vs `emailed`.
- **Export leads**: download `leads-export.csv` from the backend.
- **Refresh buttons**: refresh leads without reloading page.

### Where it is

- Frontend:
  - `frontend/src/App.jsx` (filters + export button)
  - `frontend/src/App.css` (layout styles for filters)
- Backend:
  - `GET /api/leads/export` in `backend/server.js`

### How to test

1. Import CSV (Day 1)
2. Use the **Search leads** box and **Status** dropdown.
3. Click **Export leads CSV** → confirm file downloads.
4. Run Day 4 campaign → leads should show **emailed**, filter by status.

