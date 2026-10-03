"use client";

import { useState } from "react";
import Icon from "../Icon";
import { Badge, Callout, Card, CodeBlock, CopyButton, PhaseHeader } from "../ui";
import { PHASES, STORAGE_KEYS } from "@/lib/constants";
import { CHECKLIST, CHECKLIST_TOTAL } from "@/lib/checklist";
import { useLocalStorage } from "@/lib/hooks";

const PHASE = PHASES[3];

const REPO_URL = "https://github.com/divyansh9876/utp-codefest-bff-workshop";

const PLATFORMS = {
  render: {
    label: "Render",
    url: `https://render.com/deploy?repo=${REPO_URL}`,
    hint: "One-click Blueprint from render.yaml, long-running Node server, free tier",
  },
  vercel: { label: "Vercel", url: "https://vercel.com/new", hint: "Zero-config for Next.js, serverless functions" },
  railway: { label: "Railway", url: "https://railway.com/new", hint: "Long-running Node server, simple variables UI" },
};

const ENV_VARS = [
  { name: "MONGODB_URI", example: "mongodb+srv://user:pass@cluster…/codefest", used: "lib/mongodb.js", secret: true },
  { name: "JWT_SECRET", example: "64+ random characters", used: "lib/auth.js", secret: true },
  { name: "JWT_EXPIRES_IN", example: "1h", used: "lib/auth.js", secret: false },
  {
    name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
    example: "…apps.googleusercontent.com",
    used: "GoogleSignIn + /api/auth/google",
    secret: false,
    buildTime: true,
  },
];

const GITIGNORE_RULES = [
  { label: "Ignores .env files", test: (t) => /^\s*\.env(\*|\.local|\*\.local)?\s*$/m.test(t) || /^\s*\.env\*/m.test(t), critical: true },
  { label: "Ignores node_modules", test: (t) => /node_modules/.test(t), critical: true },
  { label: "Ignores .next build output", test: (t) => /\.next/.test(t), critical: false },
  { label: "Ignores .vercel", test: (t) => /\.vercel/.test(t), critical: false },
];

const LEAK_PATTERNS = [
  { label: "MongoDB URI with credentials", re: /mongodb(\+srv)?:\/\/[^:\s/]+:[^@\s]+@/i },
  { label: "Secret exposed via NEXT_PUBLIC_", re: /NEXT_PUBLIC_[A-Z_]*(SECRET|URI|PASSWORD|KEY|TOKEN)/ },
  { label: "Hard-coded JWT secret", re: /(JWT_SECRET\s*[=:]\s*["']?[^"'\s<]{6,})|(jwt\.sign\([^)]*,\s*["'][^"']+["'])/ },
  { label: "Plain-text password field stored", re: /password\s*:\s*\{\s*type\s*:\s*String/ },
];

const pick = (value, platform) => (value && typeof value === "object" ? value[platform] : value);

function InlineCode({ text }) {
  if (!text) return null;
  return text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

function randomSecret(bytes = 48) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let binary = "";
  buf.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
        {secret && <CopyButton text={`JWT_SECRET="${secret}"`} label="Copy line" />}
      </div>
      <p className="tiny muted">
        Or in a terminal: <code>node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(48).toString(&apos;base64url&apos;))&quot;</code>
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
        placeholder={mode === "gitignore" ? "Paste your .gitignore here…" : "Paste any source file, e.g. a route handler or next.config.mjs…"}
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
    <Card title="Production smoke test" subtitle="Paste your deployed URL" icon="rocket">
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
      <p className="tiny muted">
        Got a 500 on <code>/api/health</code> in production? Nine times out of ten it&apos;s a missing env var or Atlas Network Access.
        On Render&apos;s free tier, the first request after idling takes ~30–60s while the service wakes up.
      </p>
    </Card>
  );
}

export default function DeployTab() {
  const [checked, setChecked] = useLocalStorage(STORAGE_KEYS.checklist, {});
  const [storedPlatform, setPlatform] = useLocalStorage(STORAGE_KEYS.platform, "render");
  const platform = PLATFORMS[storedPlatform] ? storedPlatform : "render";
  const [openCode, setOpenCode] = useState(null);
  const done = CHECKLIST.reduce((sum, s) => sum + s.items.filter((i) => checked[i.id]).length, 0);
  const complete = done >= CHECKLIST_TOTAL;

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="tab-panel">
      <PhaseHeader
        phase={PHASE}
        title="Deploy & Security Checklist"
        lead="Your BFF works locally, now ship it without leaking a single secret. Tick each item as you walk through it live: push the repo, set environment variables in the cloud dashboard, and smoke-test production."
        files={[".gitignore", ".env.example", "render.yaml", "Render dashboard"]}
      />

      {complete && (
        <div className="shipped">
          <Icon name="rocket" size={28} />
          <div>
            <strong>Shipped!</strong>
            <p>Your Backend-for-Frontend is live with secrets locked down. Go build something for CodeFest.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked({})}>
            <Icon name="reset" size={14} /> Reset
          </button>
        </div>
      )}

      <div className="grid grid-main">
        <div className="stack">
          <Card
            title="Ship-it checklist"
            subtitle="Progress is saved in this browser"
            icon="shieldCheck"
            actions={
              <div className="segmented segmented-sm">
                {Object.entries(PLATFORMS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    className={`segment${platform === key ? " segment-active" : ""}`}
                    onClick={() => setPlatform(key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="checklist-head">
              <Progress done={done} total={CHECKLIST_TOTAL} />
              <div>
                <strong>Deploying to {PLATFORMS[platform].label}</strong>
                <p className="muted">{PLATFORMS[platform].hint}</p>
                <a className="btn btn-secondary btn-sm" href={PLATFORMS[platform].url} target="_blank" rel="noreferrer">
                  Open {PLATFORMS[platform].label} <Icon name="external" size={13} />
                </a>
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
                      const code = pick(item.code, platform);
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
                                  <InlineCode text={pick(item.title, platform)} />
                                </span>
                                {item.warn && <Badge tone="danger">common mistake</Badge>}
                              </span>
                              {item.detail && (
                                <span className="check-detail">
                                  <InlineCode text={pick(item.detail, platform)} />
                                </span>
                              )}
                            </span>
                          </label>
                          {code && (
                            <>
                              <button type="button" className="btn btn-ghost btn-xs check-code-toggle" onClick={() => setOpenCode(isOpen ? null : item.id)}>
                                <Icon name={item.filename ? "file" : "terminal"} size={12} />
                                {isOpen ? "Hide" : "Show"} {item.filename || "commands"}
                              </button>
                              {isOpen && <CodeBlock code={code} filename={item.filename} compact />}
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
          <Card title="Environment variables" subtitle={`Set these in ${PLATFORMS[platform].label}`} icon="server">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Example</th>
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
                      {v.buildTime && <span className="public-tag">public · build-time</span>}
                    </td>
                    <td className="muted tiny">{v.example}</td>
                    <td>
                      <code className="tiny">{v.used}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Callout tone="danger" title="Never NEXT_PUBLIC_MONGODB_URI">
              The <code>NEXT_PUBLIC_</code> prefix copies a value into the JavaScript sent to every visitor. BFF secrets
              are read only inside route handlers.
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
