# My JEE Mentor

Responsive multi-page website for JEE, NEET and Foundation coaching. Pages use semantic HTML shells with shared ES modules and CSS. The lead API stores enquiries in SQLite using prepared statements.

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and configure the values. Set `ALLOWED_ORIGIN` to the exact origin used in your browser.
3. Install dependencies: `npm install`.
4. Compile Tailwind: `npm run build:css`.
5. Start locally: `npm run dev`; visit `http://localhost:3000`.

### Priya — JEE Mentor AI chat

1. Copy `.env.example` to `.env.local` and set `AI_PROVIDER=gemini`, `AI_API_KEY` to a Google AI Studio key, `AI_MODEL=gemini-3.8-flash`, and `AI_FALLBACK_MODEL=gemini-2.5-flash-lite`. The fallback model can be changed in Vercel Environment Variables without a code change. The API key is server-only; `.env.local` is ignored by Git.
2. Run `npm run dev` and open any page. Use the floating Priya button to ask about fees, faculty, or a demo. Run `npm test` for the mocked API checks, including unrelated questions and provider failure.
3. In Vercel Project Settings → Environment Variables, add `AI_PROVIDER`, `AI_API_KEY`, and `AI_MODEL` for Production (and Preview if desired), then redeploy. The `/api/chat` function reads `knowledge/mentor-data.md`; `vercel.json` includes that file in the function bundle.

The widget is dynamically loaded after the shared page script, and its styles are namespaced in `js/chat-widget.css`. Gemini is the default provider; OpenAI and Anthropic can be selected with `AI_PROVIDER` and a matching `AI_MODEL`.

SQLite creates `data/leads.sqlite` on the first API request. Production must set `NODE_ENV=production`, a strong Cloudflare Turnstile site key and secret, an HTTPS origin, and the public WhatsApp number. The site intentionally does not ship a sample database or credentials.

## Pages

Home, JEE, NEET, Foundation, courses, JEE Booster detail, results, faculty, why us, reviews, free resources, faculty login, contact, 404, privacy, terms and refund pages are included. Static `.html` links work directly; Express also resolves extensionless URLs. Replace placeholder contact details and confirm the canonical domain before launch.

## Deployment

### Local auto-sync to GitHub and Vercel

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\auto-sync.ps1` from the project folder to watch local edits. After 15 seconds without another change, the watcher stages non-ignored files, creates a timestamped commit and pushes it to `origin/main`. Vercel can then deploy the pushed commit when the GitHub integration is enabled for this repository. Check `%TEMP%\my-jee-mentor-auto-sync.log` for sync status. Stop the watcher by ending the PowerShell process running `scripts\auto-sync.ps1`; it stops when Windows shuts down.

### VPS with Nginx

Run `npm ci && npm run build:css`, then run `npm start` under a process manager such as systemd or PM2. Keep Node bound behind Nginx, terminate TLS with a valid certificate, and proxy to `127.0.0.1:3000` with `X-Forwarded-Proto` and `X-Forwarded-For`. Persist `data/` across deployments and restrict it to the application user. Set `.env` values through the host secret manager. Configure DNS and point Search Console to the verified domain.

### Render

Create a Node web service with build command `npm ci && npm run build:css` and start command `npm start`. Add all `.env` values in Render's secret environment settings. Attach a persistent disk and set `DATABASE_PATH` to a file on that disk; SQLite is intended for a modest single-instance deployment. Use managed PostgreSQL and a parameterized driver/ORM before scaling to multiple instances.

### Faculty login and free resources

The faculty portal is `/login.html`. Set these server-side Vercel Environment Variables:

- `FACULTY_ID`: one fixed faculty login ID.
- `FACULTY_PASSWORD`: its password.
- `FACULTY_SESSION_SECRET`: random secret with at least 32 characters.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token for the public JSON resource list.

Credentials are read only by the API and are never placed in browser code. A successful login sets a signed, HttpOnly, Secure, SameSite=Lax cookie for seven days. Five failed attempts for the same IP and ID lock that running function instance for 15 minutes. Add and delete operations update the Blob JSON without a redeploy.

Faculty add a title (up to 80 characters), Google Drive link, and type. The link must be HTTPS from `drive.google.com` or `docs.google.com`; share the file as “Anyone with the link – Viewer”. The public resource API returns the resource list only.
### Vercel

The new `/api/chat` route is a Vercel Node.js function. The Express server and SQLite file are not a suitable serverless persistence configuration for `/api/leads`; move that route to a Vercel function backed by managed PostgreSQL (parameterized SQL) or deploy the supplied Express API on Render. Configure the frontend API URL and CORS origin for that split deployment.

## Database schema

`server/db.js` creates `leads` with `id`, student/parent names, phone and WhatsApp, class, exam, target year, current coaching, preferred subject, city, language, message and a server-generated timestamp. All values use a prepared insert statement.

## Security checklist

- HTTPS redirect, Helmet headers and a restrictive Content Security Policy are configured for Express.
- CORS is restricted to `ALLOWED_ORIGIN`; request size is capped; the lead route uses rate limiting, a honeypot, CSRF double-submit token, server-side field validation and optional Turnstile verification.
- SQLite writes are parameterized; database and secrets remain server-side; generic API errors avoid exposing internals.
- Keep dependencies updated and run `npm audit` before each production release. Back up and restrict the database file; add retention/deletion procedures for personal data.
- Set Turnstile keys and validate behavior on the production domain. Configure a privacy-compliant analytics consent policy before enabling GA4 or Meta Pixel.

## Replace before launch

- Phone, WhatsApp, office location and map query.
- Faculty names, qualifications, experience and previous institutes (verify every claim).
- Results, ranks/scores and student stories only after verification and consent.
- Testimonials and video IDs after consent; current social links are generic destinations.
- Program calendars, batch sizes, subject fees and full fee structure.
- Domain, SEO descriptions, Open Graph artwork, organization details and analytics IDs.
- Turnstile credentials, production origin and legal policy wording reviewed for the operating business.

The home hero image is a locally stored Pexels photo by Katerina Holmes, available on Pexels' free-to-use license: https://www.pexels.com/photo/crop-black-female-teacher-teaching-kids-remotely-on-laptop-5905964/ . It shows two learners on screen; the “up to 10” note describes the stated batch cap, not the number of people pictured.

## Current limitations

The course/results/faculty/review/resource grids use clearly identified placeholder content. No Google Drive Picker/OAuth integration, Google Sheets integration, GA4 or Meta Pixel IDs are configured. The 3D hero has a CSS fallback and conditionally loads a lightweight Three.js particle scene; third-party video embeds are click-to-load.
