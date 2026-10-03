import {
  DOCKERFILE,
  ENV_EXAMPLE,
  GITIGNORE_BFF,
  GITIGNORE_FE,
  GIT_PUSH,
  GIT_UNTRACK,
  RENDER_YAML,
} from "./snippets";

/** Deploy checklist: Spring Boot BFF (Docker on Render) + Next.js UI (Node on Render). */
export const CHECKLIST = [
  {
    id: "secrets",
    title: "Lock down secrets",
    icon: "key",
    items: [
      {
        id: "gitignore",
        title: ".gitignore ignores .env in BOTH projects",
        detail: "Frontend: `.env*`. Spring Boot: `.env`, `target/`, `.idea/`.",
        why: "`git add .` stages everything that isn't ignored. One missing line and your Atlas password is public forever.",
        code: `${GITIGNORE_BFF}\n\n${GITIGNORE_FE}`,
        filename: ".gitignore (both)",
      },
      {
        id: "env-local",
        title: "application.yml only contains ${PLACEHOLDERS}",
        detail: "`spring.mongodb.uri: ${MONGODB_URI}`, never the real connection string.",
        why: "application.yml is committed and shared. Placeholders make it safe to publish, and the same jar runs anywhere: env vars decide where it connects.",
      },
      {
        id: "no-public",
        title: "No secret uses the NEXT_PUBLIC_ prefix",
        detail: "Only the Google client ID is public. The frontend should have no secrets at all.",
        why: "NEXT_PUBLIC_ values are copied into the JavaScript every visitor downloads. Secrets belong in Spring Boot's environment.",
        warn: true,
      },
      {
        id: "env-example",
        title: "Commit a .env.example with placeholders",
        why: "Teammates, judges and future you know exactly which variables to set, without ever seeing real values.",
        code: ENV_EXAMPLE,
        filename: ".env.example",
      },
      {
        id: "strong-secret",
        title: "JWT_SECRET is 32+ random bytes",
        detail: "Use the generator on this page, or let Render generate it.",
        why: "HMAC-signed JWTs need a key of at least 256 bits; jjwt refuses shorter ones (WeakKeyException). A guessable secret lets anyone forge a token for any user.",
      },
    ],
  },
  {
    id: "push",
    title: "Push to GitHub",
    icon: "git",
    items: [
      {
        id: "git-status",
        title: "`git status` lists no .env files",
        detail: "Check in both the frontend and bff folders.",
        why: "Git history is forever. Deleting a committed secret in a later commit doesn't remove it: you have to rotate it.",
        code: GIT_UNTRACK,
      },
      {
        id: "git-push",
        title: "Push the frontend and the bff (two repos)",
        why: "Render deploys from GitHub and redeploys on every push. Separate repos let each service build and deploy independently.",
        code: GIT_PUSH,
      },
    ],
  },
  {
    id: "atlas",
    title: "Prepare MongoDB Atlas",
    icon: "database",
    items: [
      {
        id: "atlas-network",
        title: "Network Access allows 0.0.0.0/0 (workshop only)",
        detail: "Render's free tier has no static outbound IPs.",
        why: "Atlas blocks every IP not on the list. In production, use a paid plan with static IPs or private networking, and keep the allowlist tight.",
      },
      {
        id: "atlas-user",
        title: "App database user has least privilege",
        detail: "readWrite on the codefest database only, not Atlas admin.",
        why: "If the BFF is ever compromised, the attacker gets one database, not your whole cluster.",
      },
    ],
  },
  {
    id: "google",
    title: "Google OAuth client",
    icon: "user",
    items: [
      {
        id: "google-client",
        title: "Create an OAuth client ID (type: Web application)",
        detail: "Google Cloud Console → APIs & Services → Credentials. Configure the consent screen first.",
        why: "The client ID identifies your app to Google. Google only issues ID tokens with that ID as the audience.",
      },
      {
        id: "google-origins",
        title: "Authorized JavaScript origins = the FRONTEND URLs",
        detail: "http://localhost, http://localhost:3000 and your frontend's onrender.com URL. No trailing slash.",
        why: "The button runs in the browser on the frontend's origin, so Google checks that origin, not Spring Boot's. A missing origin = the button errors.",
        warn: true,
      },
      {
        id: "google-env",
        title: "Same client ID in both services",
        detail: "Frontend: NEXT_PUBLIC_GOOGLE_CLIENT_ID. Spring Boot: GOOGLE_CLIENT_ID.",
        why: "The frontend needs it to render the button; the BFF needs it to check the token's audience. Client IDs are public, and this flow never needs the client secret.",
      },
    ],
  },
  {
    id: "deploy",
    title: "Deploy to Render",
    icon: "rocket",
    items: [
      {
        id: "deploy-bff",
        title: "Deploy the Spring Boot BFF: New → Web Service → Docker",
        detail: "Pick the bff repo, region Singapore, Health Check Path /api/health.",
        why: "Render has no native Java runtime. The Dockerfile packages a JRE and your jar, so what runs on Render is exactly what you built.",
        code: DOCKERFILE,
        filename: "bff/Dockerfile",
      },
      {
        id: "deploy-bff-env",
        title: "Set BFF env vars: MONGODB_URI, JWT_SECRET, JWT_EXPIRATION_MINUTES, GOOGLE_CLIENT_ID",
        detail: "Render injects PORT; application.yml reads server.port=${PORT:8080}.",
        why: "Without server.port=${PORT}, Spring listens on 8080 while Render probes another port: the deploy \"succeeds\" but never goes live.",
      },
      {
        id: "deploy-fe",
        title: "Deploy the frontend: New → Blueprint (render.yaml)",
        detail: "Set BFF_URL to the BFF's onrender.com URL and NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
        why: "BFF_URL tells the Next.js proxy where Spring Boot lives. It's read at build time, so set it before the first build (or Clear build cache & deploy).",
        code: RENDER_YAML,
        filename: "render.yaml",
      },
      {
        id: "deploy-smoke",
        title: "Smoke-test production",
        detail: "Open <frontend>/api/health, then register, log in and create a project on the live UI.",
        why: "/api/health through the frontend proves every hop: browser → Next.js proxy → Spring Boot → Atlas. Free instances sleep after ~15 min; Spring Boot can take 1–2 min to wake.",
      },
    ],
  },
  {
    id: "hardening",
    title: "Security hardening",
    icon: "shieldCheck",
    items: [
      {
        id: "no-hash-leak",
        title: "Responses never include passwordHash",
        detail: "@JsonIgnore on the field; return DTOs for anything sensitive.",
        why: "Even a hash helps attackers crack passwords offline. It should never leave the server.",
      },
      {
        id: "generic-errors",
        title: "Login errors are generic",
        detail: "\"Invalid email or password\", whatever actually failed.",
        why: "Different messages let attackers enumerate which emails are registered.",
      },
      {
        id: "validate",
        title: "@Valid on every request DTO",
        why: "Browser validation is a UX nicety anyone can bypass with curl. The BFF is the real gate.",
      },
      {
        id: "rotate",
        title: "Know how to rotate a leaked secret",
        detail: "New Atlas password + new JWT_SECRET → update Render env → redeploy.",
        why: "Rotating JWT_SECRET instantly invalidates every issued token, so a leaked token stops working too.",
      },
    ],
  },
];

export const CHECKLIST_TOTAL = CHECKLIST.reduce((sum, s) => sum + s.items.length, 0);
