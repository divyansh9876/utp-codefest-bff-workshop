# UTP CodeFest · BFF Workshop

Interactive, pre-built **Next.js frontend** for a 2-hour **Backend-for-Frontend** workshop. The BFF itself is live-coded in **Java 21 + Spring Boot 4.1** with MongoDB Atlas, BCrypt, JWT and Google sign-in.

The UI replaces slides. Every phase explains **what** you build and **why**: a goal, the reasoning behind each design choice, an analogy, common pitfalls, and a "why" note on every live-coding step. Each tab lights up as soon as the matching Spring Boot endpoint responds.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/divyansh9876/utp-codefest-bff-workshop)

## How the pieces fit

```
Browser ──/api/*──▶ Next.js (this repo) ──proxy──▶ Spring Boot BFF :8080 ──▶ MongoDB Atlas
                    next.config.mjs rewrites        controllers · services · repositories
```

The browser only ever calls `/api/*` on the frontend's origin. `next.config.mjs` forwards those requests to the Spring Boot BFF at `BFF_URL`, so you don't need any CORS configuration. All secrets live in the BFF; the frontend has none.

## Run it

```bash
# Frontend (this repo)
npm install
cp .env.example .env.local      # BFF_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev                     # http://localhost:3000

# Spring Boot BFF (separate folder, built during the workshop)
./mvnw spring-boot:run          # http://localhost:8080
```

Press `1` to `4` to switch phases. The header pill shows **BFF offline** until Spring Boot is running.

## The four phases

| Tab | Time | You live-code in Spring Boot | Proof it works |
| --- | --- | --- | --- |
| 1. Architecture & DB | 30m | `pom.xml`, `application.yml`, `.env`, `HealthController` | Ping Database badge turns green |
| 2. CRUD Playground | 45m | `Project`, `ProjectRepository`, `ProjectService`, `ProjectController`, `ApiExceptionHandler` | Submitted project appears in the feed |
| 3. Auth & JWT Vault | 30m | `User`, `UserRepository`, `JwtService`, `AuthController` (local + Google), `JwtAuthFilter` | Token decodes in the inspector, delete buttons unlock |
| 4. Deploy & Security | 15m | `Dockerfile`, env vars, Render | Live URL passes the smoke test |

Reference code for every file is in the collapsed **Presenter cheat sheet** at the bottom of tabs 1–3.

## API contract the UI expects

| Method | Path | Body | Success response |
| --- | --- | --- | --- |
| GET | `/api/health` | none | `200 { status: "ok", db: "connected", dbName, latencyMs }` |
| GET | `/api/projects` | none | `200 { projects: [...] }` |
| POST | `/api/projects` | `{ title, description, category, teamName?, repoUrl? }` | `201 { project }`, or `400 { error }` |
| DELETE | `/api/projects/{id}` | Header `Authorization: Bearer <jwt>` | `200`, or `401` without a valid token |
| POST | `/api/auth/register` | `{ name, email, password }` | `201 { user }` (never the hash) |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }`, or `401 { error }` |
| POST | `/api/auth/google` | `{ credential }` (Google ID token) | `200 { token, user }`, or `401 { error }` |

Errors should be JSON `{ "error": "message" }` (the `ApiExceptionHandler` in the cheat sheet does this). The UI recognises:

- Spring's default 404 and 405 responses as "endpoint not mapped yet".
- Proxy failures as "BFF offline".

## Login providers

Both providers end in the **same JWT**, signed by `JwtService`, so `JwtAuthFilter` only ever verifies one kind of token.

- **Local**: `BCryptPasswordEncoder.encode()` on register, `matches()` on login, then a JWT.
- **Google**: the Google Identity Services button gives the browser a Google-signed ID token. Spring Boot checks it with `GoogleIdTokenVerifier` (signature, expiry, and audience = your client ID), finds or creates the user, then signs our JWT.

### Google Cloud setup

1. Google Cloud Console → APIs & Services → **OAuth consent screen**: set it up as External and add yourself as a test user.
2. **Credentials → Create credentials → OAuth client ID**, type **Web application**.
3. Under **Authorized JavaScript origins**, add the **frontend** URLs: `http://localhost`, `http://localhost:3000`, and your frontend's `onrender.com` URL.
4. Put the client ID in both places: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (BFF). It's public; no client secret is needed.

## Deploy to Render

1. **BFF**: New → Web Service → the bff repo, with **Docker** (Dockerfile in the cheat sheet). Set the Health Check Path to `/api/health` and the env vars `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`, `GOOGLE_CLIENT_ID`. `application.yml` uses `server.port=${PORT:8080}` so Render can reach it.
2. **Frontend**: click **Deploy to Render** above (it uses `render.yaml`). Set `BFF_URL` to the BFF's `onrender.com` URL, and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
3. In MongoDB Atlas → Network Access, allow `0.0.0.0/0`, because Render's free tier has no static IPs.

`BFF_URL` and `NEXT_PUBLIC_*` are read at **build time**. After changing them, run **Manual Deploy → Clear build cache & deploy**. Free instances sleep after about 15 minutes idle, and Spring Boot can take 1–2 minutes to wake up.

## Presenter helpers built into the UI

- **Why panels**: a goal, reasons, an analogy and pitfalls for each phase, plus a toggleable "why" note on every live-coding step and checklist item.
- **Workshop clock**: a 2-hour timer split into the four phases.
- **BFF Network Inspector**: every request with its status, timing and Bearer flag, plus the request and response bodies. Passwords are masked.
