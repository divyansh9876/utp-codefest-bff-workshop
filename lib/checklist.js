import { ENV_EXAMPLE, GITIGNORE, GIT_PUSH, GIT_UNTRACK, RENDER_YAML, VERCEL_CLI } from "./snippets";

/**
 * Deploy checklist. Items in the "deploy" section have per-platform copy,
 * but share ids so progress is the same whichever platform is selected.
 */
export const CHECKLIST = [
  {
    id: "secrets",
    title: "Lock down secrets",
    icon: "key",
    items: [
      {
        id: "gitignore",
        title: ".gitignore ignores every .env file",
        detail: "Next.js scaffolds this for you — double-check `.env*` is there before your first commit.",
        code: GITIGNORE,
        filename: ".gitignore",
      },
      {
        id: "env-local",
        title: "Secrets live only in .env.local",
        detail: "MONGODB_URI and JWT_SECRET are read with process.env inside route handlers — never hard-coded.",
      },
      {
        id: "no-public",
        title: "No secret uses the NEXT_PUBLIC_ prefix",
        detail: "NEXT_PUBLIC_ variables are inlined into the browser bundle. Anyone can read them in DevTools.",
        warn: true,
      },
      {
        id: "env-example",
        title: "Commit a .env.example with placeholders",
        detail: "Teammates (and future you) know which variables to set without seeing real values.",
        code: ENV_EXAMPLE,
        filename: ".env.example",
      },
      {
        id: "strong-secret",
        title: "JWT_SECRET is long and random",
        detail: "Use the generator below. A guessable secret means anyone can forge a valid token.",
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
        title: "`git status` does not list .env.local",
        detail: "If it does, stop. Fix .gitignore first.",
        code: GIT_UNTRACK,
      },
      {
        id: "git-push",
        title: "Commit and push to a GitHub repo",
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
        title: "Network Access allows your host",
        detail:
          "Serverless platforms use changing IPs, so for the workshop allow 0.0.0.0/0. In production, prefer your provider's static IPs or private networking.",
      },
      {
        id: "atlas-user",
        title: "Database user has a strong password & least privilege",
        detail: "Give the app user readWrite on its own database only — not Atlas admin.",
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
        detail: "Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID. Configure the consent screen first if asked.",
      },
      {
        id: "google-origins",
        title: "Authorized JavaScript origins include local AND production",
        detail:
          "Add http://localhost, http://localhost:3000 and your live URL (e.g. https://utp-codefest-bff-workshop.onrender.com). No trailing slash. Missing origin = the button errors.",
        warn: true,
      },
      {
        id: "google-env",
        title: "Client ID set as NEXT_PUBLIC_GOOGLE_CLIENT_ID",
        detail: "Client IDs are public, so NEXT_PUBLIC_ is fine here. It's baked in at build time, so rebuild after changing it. Never expose the client secret (this flow doesn't need one).",
      },
    ],
  },
  {
    id: "deploy",
    title: "Deploy",
    icon: "rocket",
    items: [
      {
        id: "deploy-import",
        title: {
          render: "New → Blueprint → pick the GitHub repo",
          vercel: "Import the repo on vercel.com/new",
          railway: "New Project → Deploy from GitHub repo",
        },
        detail: {
          render: "Render reads render.yaml: Node web service, build npm ci && npm run build, start npm start, Singapore region.",
          vercel: "Vercel auto-detects Next.js. Leave build settings as default.",
          railway: "Railway detects Node/Next.js via Nixpacks. Build: npm run build, Start: npm start.",
        },
        code: { render: RENDER_YAML },
        filename: "render.yaml",
      },
      {
        id: "deploy-env",
        title: {
          render: "Fill in the env vars Render prompts for",
          vercel: "Add env vars in Settings → Environment Variables",
          railway: "Add env vars in the service's Variables tab",
        },
        detail: {
          render: "MONGODB_URI and NEXT_PUBLIC_GOOGLE_CLIENT_ID are prompted (sync: false). JWT_SECRET is auto-generated. Edit later under the service's Environment tab.",
          vercel: "Add MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN and NEXT_PUBLIC_GOOGLE_CLIENT_ID for Production.",
          railway: "Use the Raw Editor to paste all four variables at once.",
        },
        code: { vercel: VERCEL_CLI },
      },
      {
        id: "deploy-redeploy",
        title: {
          render: "Wait for \"Live\", then copy the onrender.com URL",
          vercel: "Deploy (or redeploy after adding env vars)",
          railway: "Deploy, then Settings → Generate Domain",
        },
        detail: {
          render: "Changing a NEXT_PUBLIC_ var needs a fresh build: Manual Deploy → Clear build cache & deploy. Free instances sleep after ~15 min idle; the first request takes ~30-60s.",
          vercel: "Env vars only apply to new deployments — redeploy if you added them after the first build.",
          railway: "Railway redeploys automatically when variables change.",
        },
      },
      {
        id: "deploy-smoke",
        title: "Smoke-test production",
        detail: "Open /api/health on your live URL, then register, log in and create a project from the deployed UI.",
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
        detail: "Use select: false on the schema and pick fields explicitly when returning users.",
      },
      {
        id: "generic-errors",
        title: "Login errors are generic",
        detail: "\"Invalid email or password\" — don't reveal whether an email is registered.",
      },
      {
        id: "validate",
        title: "Validate input on the server",
        detail: "Browser validation is a UX nicety. The BFF is the real gate (Mongoose validators, length limits, enums).",
      },
      {
        id: "rotate",
        title: "Know how to rotate a leaked secret",
        detail: "Leaked in a commit? Rotate it immediately — deleting the commit isn't enough, it's already in history.",
      },
    ],
  },
];

export const CHECKLIST_TOTAL = CHECKLIST.reduce((sum, s) => sum + s.items.length, 0);
