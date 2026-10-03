"use client";

import { useState } from "react";
import Icon from "../Icon";
import { Badge, Callout, Card, CodeBlock, CopyButton, PhaseHeader, WhyPhase, WhyText } from "../ui";
import { PHASES, STORAGE_KEYS } from "@/lib/constants";
import { CHECKLIST, CHECKLIST_TOTAL } from "@/lib/checklist";
import { useLocalStorage } from "@/lib/hooks";

const PHASE = PHASES[3];
const REPO_URL = "https://github.com/divyansh9876/utp-codefest-bff-workshop";

const SERVICES = [
  {
    name: "Spring Boot BFF",
    icon: "server",
    how: "Web Service · Docker",
    url: "https://dashboard.render.com/web/new",
    cta: "New Web Service",
  },
  {
    name: "Next.js frontend",
    icon: "monitor",
    how: "Blueprint · render.yaml",
    url: `https://render.com/deploy?repo=${REPO_URL}`,
    cta: "Deploy Blueprint",
  },
];

const ENV_VARS = [
  { name: "MONGODB_URI", service: "BFF", example: "mongodb+srv://user:pass@cluster…/codefest", used: "application.yml", secret: true },
  { name: "JWT_SECRET", service: "BFF", example: "32+ random bytes", used: "JwtService", secret: true },
  { name: "JWT_EXPIRATION_MINUTES", service: "BFF", example: "60", used: "JwtService" },
  { name: "GOOGLE_CLIENT_ID", service: "BFF", example: "…apps.googleusercontent.com", used: "AuthController (aud check)" },
  { name: "BFF_URL", service: "UI", example: "https://utp-codefest-bff.onrender.com", used: "next.config.mjs proxy", buildTime: true },
  {
    name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    service: "UI",
    example: "…apps.googleusercontent.com",
    used: "GoogleSignIn button",
    buildTime: true,
  },
];

const GITIGNORE_RULES = [
  { label: "Ignores .env files", test: (t) => /^\s*\/?\.env(\*|\.local)?\s*$/m.test(t), critical: true },
  { label: "Ignores target/ (Maven build output)", test: (t) => /^\s*\/?target\/?\s*$/m.test(t), critical: false },
  { label: "Ignores node_modules (frontend)", test: (t) => /node_modules/.test(t), critical: false },
  { label: "Ignores IDE files (.idea, *.iml)", test: (t) => /\.idea|\*\.iml/.test(t), critical: false },
];

const LEAK_PATTERNS = [
  { label: "MongoDB URI with credentials", re: /mongodb(\+srv)?:\/\/[^:\s/$]+:[^@\s]+@/i },
  { label: "Secret exposed via NEXT_PUBLIC_", re: /NEXT_PUBLIC_[A-Z_]*(SECRET|URI|PASSWORD|KEY|TOKEN)/ },
  { label: "Hard-coded JWT secret (not a ${PLACEHOLDER})", re: /(jwt[._-]?secret|JWT_SECRET)\s*[=:]\s*["']?(?!\$\{)[^"'\s<]{6,}/i },
  { label: "Secret string passed to Keys.hmacShaKeyFor", re: /hmacShaKeyFor\(\s*"[^"]+"/ },
  { label: "Plain-text password stored on an entity", re: /private\s+String\s+password\s*;[\s\S]*@Document|@Document[\s\S]*private\s+String\s+password\s*;/ },
];

function randomSecret(bytes = 48) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let binary = "";
  buf.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function InlineCode({ text }) {
  if (!text) return null;
  return text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

function Progress({ done, total }) {
  const pct = Math.round((done / total) * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring-wrap">
      <svg width="88" height="88" viewBox="0 0 88 88" className="ring">
        <circle cx="44" cy="44" r={r} className="ring-track" />
        <circle cx="44" cy="44" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <div className="ring-text">
        <strong>{pct}%</strong>
        <span>
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

function SecretGenerator() {
  const [secret, setSecret] = useState("");
  return (
    <Card title="JWT_SECRET generator" subtitle="crypto.getRandomValues: generated in your browser, never sent anywhere" icon="key">
      <div className="secret">
        <code className={`secret-value${secret ? "" : " muted"}`}>{secret || "Click generate →"}</code>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setSecret(randomSecret())}>
          <Icon name="refresh" size={14} /> Generate
        </button>
        {secret && <CopyButton text={`JWT_SECRET=${secret}`} label="Copy line" />}
      </div>
      <WhyText>48 random bytes become 64 characters, well above jjwt&apos;s 32-byte minimum. With a 64-byte key, jjwt signs tokens with HS512.</WhyText>
      <p className="tiny muted">
        Or in a terminal: <code>openssl rand -base64 48</code>
      </p>
    </Card>
  );
}

function PrePushScanner() {
  const [mode, setMode] = useState("gitignore");
  const [text, setText] = useState("");

  const gitResults = GITIGNORE_RULES.map((r) => ({ ...r, pass: r.test(text) }));
  const leaks = LEAK_PATTERNS.filter((p) => p.re.test(text));

  return (
    <Card
      title="Pre-push scanner"
      subtitle="Paste a file to check it before you push"
      icon="search"
      actions={
        <div className="segmented segmented-sm">
          <button type="button" className={`segment${mode === "gitignore" ? " segment-active" : ""}`} onClick={() => setMode("gitignore")}>
            .gitignore
          </button>
          <button type="button" className={`segment${mode === "leaks" ? " segment-active" : ""}`} onClick={() => setMode("leaks")}>
            Leak scan
          </button>
        </div>
      }
    >
      <textarea
        className="mono"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          mode === "gitignore"
            ? "Paste your .gitignore here…"
            : "Paste application.yml, a Java class, or next.config.mjs…"
        }
      />
      {text && mode === "gitignore" && (
        <ul className="scan">
          {gitResults.map((r) => (
            <li key={r.label} className={r.pass ? "scan-pass" : r.critical ? "scan-fail" : "scan-warn"}>
              <Icon name={r.pass ? "check" : r.critical ? "x" : "alert"} size={14} />
              {r.label}
              {!r.pass && r.critical && <Badge tone="danger">fix before pushing</Badge>}
            </li>
          ))}
        </ul>
      )}
      {text && mode === "leaks" && (
        leaks.length === 0 ? (
          <Callout tone="success" title="No obvious secrets found">
            Still eyeball it. Scanners catch patterns, not everything.
          </Callout>
        ) : (
          <ul className="scan">
            {leaks.map((l) => (
              <li key={l.label} className="scan-fail">
                <Icon name="alert" size={14} />
                {l.label}
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  );
}

function SmokeTest() {
  const [url, setUrl] = useLocalStorage(STORAGE_KEYS.prodUrl, "");
  const clean = (url || "").trim().replace(/\/+$/, "");
  const valid = /^https?:\/\/.+/.test(clean);
  const links = [
    { path: "/api/health", label: "Health check", expect: '{ "db": "connected" }' },
    { path: "/api/projects", label: "Project feed", expect: '{ "projects": [...] }' },
    { path: "/", label: "Workshop UI", expect: "This app, live" },
  ];
  return (
    <Card title="Production smoke test" subtitle="Paste your deployed FRONTEND URL" icon="rocket">
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://utp-codefest-bff-workshop.onrender.com" />
      <div className="smoke">
        {links.map((l) => (
          <a
            key={l.path}
            className={`smoke-link${valid ? "" : " smoke-disabled"}`}
            href={valid ? `${clean}${l.path}` : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!valid}
          >
            <span>
              <strong>{l.label}</strong>
              <code>{l.path}</code>
            </span>
            <span className="muted tiny">{l.expect}</span>
            <Icon name="external" size={14} />
          </a>
        ))}
      </div>
      <WhyText>
        Testing through the frontend URL exercises every hop: browser → Next.js proxy → Spring Boot → Atlas. A 500 usually means a
        wrong <code>BFF_URL</code>, a missing env var, or Atlas Network Access.
      </WhyText>
    </Card>
  );
}

export default function DeployTab() {
  const [checked, setChecked] = useLocalStorage(STORAGE_KEYS.checklist, {});
  const [openCode, setOpenCode] = useState(null);
  const done = CHECKLIST.reduce((sum, s) => sum + s.items.filter((i) => checked[i.id]).length, 0);
  const complete = done >= CHECKLIST_TOTAL;

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="tab-panel">
      <PhaseHeader
        phase={PHASE}
        title="Deploy & Security Checklist"
        lead="Your BFF works locally, so now ship both services without leaking a single secret: the Spring Boot BFF as a Docker web service, and the Next.js UI whose /api proxy points at it. Tick each item as you walk through it live."
        files={["bff/Dockerfile", ".gitignore", ".env.example", "render.yaml", "Render dashboard"]}
      />

      <WhyPhase
        goal="Get both services live on Render with every secret in environment variables, none in git."
        reasons={[
          {
            icon: "key",
            title: "Why environment variables?",
            text: "The same build runs locally and in production; only the env changes. Secrets never touch the codebase, so the repo can be public for judges and teammates.",
          },
          {
            icon: "git",
            title: "Why obsess over .gitignore?",
            text: "Bots scan GitHub for leaked MongoDB URIs within minutes of a push. Git history is permanent, so prevention is the only cheap fix.",
          },
          {
            icon: "server",
            title: "Why Docker for Spring Boot?",
            text: "Render has no built-in Java runtime. A multi-stage Dockerfile builds the jar with Maven, then ships it on a slim JRE image, giving reproducible builds.",
          },
          {
            icon: "layers",
            title: "Why two services?",
            text: "The UI and the BFF scale, deploy and fail independently. The Next.js proxy (BFF_URL) keeps them on one origin from the browser's point of view.",
          },
        ]}
        analogy="Env vars are a hotel-room safe. Every room (deployment) has the same safe (code), but each guest sets their own combination, and the combination is never printed on the door."
        pitfalls={[
          "Missing server.port=${PORT}: Render can't reach Spring Boot",
          "Changing BFF_URL without rebuilding the frontend",
          "Spring Boot exceeding 512 MB on the free tier (use MaxRAMPercentage)",
          "Google origins listing the BFF URL instead of the frontend URL",
        ]}
      />

      {complete && (
        <div className="shipped">
          <Icon name="rocket" size={28} />
          <div>
            <strong>Shipped!</strong>
            <p>Your Spring Boot BFF and Next.js UI are live with secrets locked down. Go build something for CodeFest.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked({})}>
            <Icon name="reset" size={14} /> Reset
          </button>
        </div>
      )}

      <div className="grid grid-main">
        <div className="stack">
          <Card title="Ship-it checklist" subtitle="Progress is saved in this browser" icon="shieldCheck">
            <div className="checklist-head">
              <Progress done={done} total={CHECKLIST_TOTAL} />
              <div className="services">
                {SERVICES.map((s) => (
                  <div key={s.name} className="service">
                    <Icon name={s.icon} size={16} />
                    <span>
                      <strong>{s.name}</strong>
                      <small>{s.how}</small>
                    </span>
                    <a className="btn btn-secondary btn-xs" href={s.url} target="_blank" rel="noreferrer">
                      {s.cta} <Icon name="external" size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {CHECKLIST.map((section) => {
              const sectionDone = section.items.filter((i) => checked[i.id]).length;
              return (
                <div key={section.id} className="check-section">
                  <div className="check-section-head">
                    <span className="check-section-title">
                      <Icon name={section.icon} size={15} /> {section.title}
                    </span>
                    <Badge tone={sectionDone === section.items.length ? "success" : "neutral"}>
                      {sectionDone}/{section.items.length}
                    </Badge>
                  </div>
                  <ul className="checklist">
                    {section.items.map((item) => {
                      const isOpen = openCode === item.id;
                      return (
                        <li key={item.id} className={`check-item${checked[item.id] ? " check-item-done" : ""}`}>
                          <label className="check-row">
                            <input type="checkbox" checked={Boolean(checked[item.id])} onChange={() => toggle(item.id)} />
                            <span className="checkbox" aria-hidden="true">
                              <Icon name="check" size={12} strokeWidth={3} />
                            </span>
                            <span className="check-text">
                              <span className="check-title">
                                <span>
                                  <InlineCode text={item.title} />
                                </span>
                                {item.warn && <Badge tone="danger">common mistake</Badge>}
                              </span>
                              {item.detail && (
                                <span className="check-detail">
                                  <InlineCode text={item.detail} />
                                </span>
                              )}
                              {item.why && (
                                <WhyText>
                                  <InlineCode text={item.why} />
                                </WhyText>
                              )}
                            </span>
                          </label>
                          {item.code && (
                            <>
                              <button type="button" className="btn btn-ghost btn-xs check-code-toggle" onClick={() => setOpenCode(isOpen ? null : item.id)}>
                                <Icon name={item.filename ? "file" : "terminal"} size={12} />
                                {isOpen ? "Hide" : "Show"} {item.filename || "commands"}
                              </button>
                              {isOpen && <CodeBlock code={item.code} filename={item.filename} compact />}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </Card>
        </div>

        <div className="stack">
          <Card title="Environment variables" subtitle="Where each one lives" icon="server">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Used in</th>
                </tr>
              </thead>
              <tbody>
                {ENV_VARS.map((v) => (
                  <tr key={v.name}>
                    <td>
                      <code>{v.name}</code>
                      {v.secret && (
                        <span className="secret-tag">
                          <Icon name="lock" size={11} /> secret
                        </span>
                      )}
                      {v.buildTime && <span className="public-tag">build-time</span>}
                      <div className="muted tiny">{v.example}</div>
                    </td>
                    <td>
                      <Badge tone={v.service === "BFF" ? "primary" : "info"}>{v.service}</Badge>
                    </td>
                    <td>
                      <code className="tiny">{v.used}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Callout tone="success" title="The frontend has zero secrets">
              Every secret lives in the Spring Boot service. The UI only knows where the BFF is (<code>BFF_URL</code>) and the public
              Google client ID.
            </Callout>
          </Card>

          <SecretGenerator />
          <PrePushScanner />
          <SmokeTest />
        </div>
      </div>
    </div>
  );
}
