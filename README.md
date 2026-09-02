# Task Manager — Clean Working Version

This is a rebuilt, verified-correct copy of your project:
- Correct backend (no more mismatched `auth.js` files, no more broken `.env`)
- Your teammate's new frontend (`index.html`, `app.js`, `style.css`) wired in
  and already talking to the right API endpoints
- A working `.env` is already included, pre-filled with the values you were
  using (Postgres password `5885`, database `task_manager`, and a real JWT
  secret) — you do NOT need to redo the `.env` setup

## How to run it

1. Unzip this folder anywhere (e.g. Desktop or Documents — avoid folder
   names with `(1)`, `(2)`, spaces, or parentheses if possible, since those
   caused confusion earlier)
2. Open the folder in VS Code
3. Open a terminal (`` Ctrl+` ``) and run:
   ```
   npm install
   ```
4. Make sure your `task_manager` database and its tables already exist in
   PostgreSQL. If you're not sure, open `schema.sql` in the VS Code
   PostgreSQL extension, connect to the `task_manager` database, and run it
   — it's safe to run again even if the tables already exist.
5. Run:
   ```
   npm run dev
   ```
6. Confirm you see:
   ```
   Server running on http://localhost:3000
   ```
7. Open your browser to `http://localhost:3000` — this now loads your
   teammate's new frontend directly (no separate frontend server needed).

## If port 3000 is already in use

Find and stop whatever's using it first:
```
netstat -ano | findstr :3000
taskkill /PID <the number from the line above> /F
```
Then run `npm run dev` again.

## Project structure

```
├── .env                  ← already filled in, real values
├── .env.example           ← template, for reference only
├── app.js                 ← Express app setup, serves the frontend
├── server.js               ← starts the server
├── db.js                   ← PostgreSQL connection
├── schema.sql               ← run this once to create tables
├── middleware/
│   ├── auth.js              ← checks if you're logged in (JWT)
│   └── rateLimiter.js         ← blocks brute-force attempts
├── routes/
│   ├── auth.js               ← register/login endpoints
│   └── tasks.js               ← task CRUD endpoints
└── frontend/
    ├── index.html              ← your teammate's new UI
    ├── app.js                   ← talks to the API above
    └── style.css
```
