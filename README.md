# UTP CodeFest · BFF Workshop

Interactive, pre-built frontend for a 2-hour **Backend-for-Frontend** workshop with Next.js Route Handlers, MongoDB Atlas, bcrypt and JWT.

The UI replaces slides. On stream you only live-code the BFF files under `app/api/`, `lib/` and `models/`. Each tab lights up as soon as its routes respond.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/divyansh9876/utp-codefest-bff-workshop)

## Run it

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, JWT_SECRET, NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

Open http://localhost:3000. Press `1` to `4` to switch phases.

## Login providers

Both providers end in the **same JWT**, so protected routes only ever check one kind of token.

- **Local**: email + password. `bcryptjs` hashes on register; login compares, then signs a JWT.
- **Google**: the Google Identity Services button gives the browser a Google-signed ID token (`credential`). The browser posts it to `/api/auth/google`. The BFF verifies it with `google-auth-library` (signature + `aud` = your client ID), finds or creates the user, and signs our JWT.

### Google Cloud setup (about 5 minutes)

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: set it up as External and add yourself as a test user.
2. **Credentials → Create credentials → OAuth client ID**, application type **Web application**.
3. Under **Authorized JavaScript origins**, add `http://localhost`, `http://localhost:3000`, and your Render URL (e.g. `https://utp-codefest-bff-workshop.onrender.com`).
4. Copy the client ID into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, then restart `npm run dev`.

The client ID is public by design; no client secret is needed for this flow. Without a client ID, the UI shows a disabled Google button with a setup hint.

## The four phases

| Tab | Time | You live-code | Proof it works |
| --- | --- | --- | --- |
| 1. Architecture & DB | 30m | `lib/mongodb.js`, `app/api/health/route.js` | Ping Database badge turns green |
| 2. CRUD Playground | 45m | `models/Project.js`, `app/api/projects/route.js` | Submitted project appears in the feed |
| 3. Auth & JWT Vault | 30m | `models/User.js`, `lib/auth.js`, `app/api/auth/register/route.js`, `app/api/auth/login/route.js`, `app/api/auth/google/route.js`, `app/api/projects/[id]/route.js` | Token decodes in the inspector, delete buttons unlock |
| 4. Deploy & Security | 15m | Nothing: walk through the checklist and deploy to Render | Live URL passes the smoke test |

## API contract the UI expects

| Method | Path | Body | Success response |
| --- | --- | --- | --- |
| GET | `/api/health` | none | `200 { status: "ok", db: "connected", dbName, latencyMs }` |
| GET | `/api/projects` | none | `200 { projects: [...] }` (a bare array also works) |
| POST | `/api/projects` | `{ title, description, category, teamName?, repoUrl? }` | `201 { project }`, or `400 { error }` |
| DELETE | `/api/projects/[id]` | Header `Authorization: Bearer <jwt>` | `200`, `401` without a valid token |
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { user }` (never the hash) |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }`, or `401 { error }` |
| POST | `/api/auth/google` | `{ credential }` (Google ID token) | `200 { token, user }`, or `401 { error }` |

Errors should be JSON `{ error: "message" }`; the UI shows that message to the user.

Until a route exists, Next.js serves its HTML 404 page and the UI shows a friendly "route not built yet" state instead of crashing.

## Presenter helpers built into the UI

- **Workshop clock** (top right): a 2-hour timer split into the four phases, showing time left in the current phase.
- **Live-coding steps** on each tab: tick them off as you go. The final step auto-completes when the endpoint works.
- **Presenter cheat sheet** (collapsed at the bottom of tabs 1–3): reference code for every BFF file, in case the live demo breaks.
- **BFF Network Inspector** (bottom dock): every request the UI makes, with status, timing, Bearer flag, and request/response bodies. Passwords are masked.

`mongoose`, `bcryptjs`, `jsonwebtoken` and `google-auth-library` are already installed, so nobody has to run `npm install` on stream.

## Deploy to Render

`render.yaml` is a Render Blueprint: a free Node web service in Singapore that builds with `npm ci && npm run build` and starts with `npm start`.

1. Click **Deploy to Render** above, or go to Render → New → Blueprint → pick this repo.
2. Fill in `MONGODB_URI` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` when prompted. `JWT_SECRET` is generated for you.
3. In MongoDB Atlas → Network Access, allow `0.0.0.0/0`, because Render's free tier has no static outbound IPs.
4. Add the `onrender.com` URL to the Google client's Authorized JavaScript origins.

`NEXT_PUBLIC_*` values are compiled into the build. After changing one, run **Manual Deploy → Clear build cache & deploy**. Free instances sleep after about 15 minutes idle, so the first request after that takes 30–60 seconds.
