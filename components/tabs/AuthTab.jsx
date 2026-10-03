"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { useWorkshop } from "../WorkshopProvider";
import GoogleSignIn from "../GoogleSignIn";
import { CategoryTag, DeleteButton } from "./CrudTab";
import {
  Badge,
  Callout,
  Card,
  CodeBlock,
  Collapsible,
  CopyButton,
  EndpointRow,
  JsonView,
  LiveCodeSteps,
  Method,
  PhaseHeader,
  WhyPhase,
} from "../ui";
import { PHASES } from "@/lib/constants";
import { AUTH_CONTROLLER, JWT_FILTER, JWT_SERVICE, USER_ENTITY, USER_REPOSITORY } from "@/lib/snippets";
import { api, projectId } from "@/lib/api";
import { decodeJwt, makeDemoToken } from "@/lib/jwt";
import { formatDuration, goToTab, useNow } from "@/lib/hooks";

const PHASE = PHASES[2];
const FAKE_ID = "000000000000000000000000";

const CLAIM_NOTES = {
  sub: "Subject: the user's id",
  iat: "Issued at (Unix seconds)",
  exp: "Expires at (Unix seconds)",
  nbf: "Not valid before",
  email: "Custom claim",
  name: "Custom claim",
  role: "Custom claim",
  provider: "How the user signed in",
  picture: "Google profile photo",
  email_verified: "Google verified this email",
  iss: "Issuer: who signed it",
  aud: "Audience: your Google client ID",
  azp: "Authorized party",
  kid: "Which Google key signed it",
  alg: "Signing algorithm",
  typ: "Token type",
};

function passwordScore(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH = ["Too weak", "Weak", "Okay", "Good", "Strong"];

function AuthForms() {
  const { signIn, signOut, isAuthed, user, decoded, notify, setGoogleCredential } = useWorkshop();
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const score = passwordScore(form.password);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const fillDemo = () =>
    setForm({ name: "Ali Hacker", email: `ali.${Math.floor(Math.random() * 9000 + 1000)}@utp.edu.my`, password: "CodeFest2026!" });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = mode === "register" ? form : { email: form.email, password: form.password };
    const r = await api(`/api/auth/${mode}`, { method: "POST", body });
    setBusy(false);
    setResult({ ...r, mode });

    if (!r.ok) {
      notify(r.notBuilt ? `POST /api/auth/${mode} isn't mapped yet` : r.error, r.notBuilt ? "warning" : "danger");
      return;
    }

    const token = r.data?.token || r.data?.accessToken;
    if (mode === "register") {
      if (token) {
        signIn(token, r.data?.user);
        notify("Registered and signed in", "success");
      } else {
        notify("Account created. Now log in.", "success");
        setMode("login");
      }
      return;
    }

    if (!token) {
      notify("Login returned 200 but no `token` field in the JSON", "warning");
      return;
    }
    signIn(token, { ...r.data?.user, provider: r.data?.user?.provider || "local" });
    notify("Logged in: JWT received, protected actions unlocked", "success");
  };

  const onGoogle = async (credential) => {
    setGoogleCredential(credential);
    setBusy(true);
    const r = await api("/api/auth/google", { method: "POST", body: { credential } });
    setBusy(false);
    setResult({ ...r, mode: "google" });

    if (!r.ok) {
      notify(r.notBuilt ? "POST /api/auth/google isn't mapped yet" : r.error, r.notBuilt ? "warning" : "danger");
      return;
    }
    const token = r.data?.token || r.data?.accessToken;
    if (!token) {
      notify("Google login returned 200 but no `token` field in the JSON", "warning");
      return;
    }
    signIn(token, { ...r.data?.user, provider: "google" });
    notify("Signed in with Google: BFF swapped the Google token for our JWT", "success");
  };

  if (isAuthed) {
    const who = { ...decoded?.payload, ...user };
    const provider = who.provider || "local";
    return (
      <Card title="Signed in" subtitle="JWT stored in this browser" icon="unlock" tone="success">
        <div className="signed-in">
          {who.avatar || who.picture ? (
            <span
              className="avatar avatar-img"
              style={{ backgroundImage: `url(${who.avatar || who.picture})` }}
              role="img"
              aria-label={who.name || "avatar"}
            />
          ) : (
            <span className="avatar">{(who.name || who.email || "?").slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <strong>{who.name || "Authenticated user"}</strong>
            <span className="muted">{who.email}</span>
          </div>
          <span className={`provider-badge provider-${provider}`}>
            {provider === "google" ? "via Google" : "via email"}
          </span>
        </div>
        <Callout tone="info" title="Where's the token?">
          It&apos;s in <code>localStorage</code> so it survives refreshes, and is sent as{" "}
          <code>Authorization: Bearer &lt;token&gt;</code> on protected requests. In production, prefer an{" "}
          <code>httpOnly</code> cookie so JavaScript (and XSS) can&apos;t read it.
        </Callout>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => { signOut(); notify("Signed out: token removed", "info"); }}>
          <Icon name="logout" size={16} /> Sign out
        </button>
      </Card>
    );
  }

  return (
    <Card
      title="Sign in"
      subtitle="Google provider + local email/password"
      icon="user"
      actions={
        <button type="button" className="btn btn-ghost btn-sm" onClick={fillDemo}>
          <Icon name="sparkle" size={14} /> Demo user
        </button>
      }
    >
      <div className="provider-block">
        <div className="provider-head">
          <span className="provider-name">Google provider</span>
          <code className="tiny">POST /api/auth/google</code>
        </div>
        <GoogleSignIn
          onCredential={onGoogle}
          onUnconfigured={() => notify("Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local first", "warning")}
        />
      </div>

      <div className="divider">
        <span>or use the local provider</span>
      </div>

      <div className="segmented">
        {["register", "login"].map((m) => (
          <button
            key={m}
            type="button"
            className={`segment${mode === m ? " segment-active" : ""}`}
            onClick={() => {
              setMode(m);
              setResult(null);
            }}
          >
            {m === "register" ? "Register" : "Login"}
          </button>
        ))}
      </div>

      <form className="form" onSubmit={onSubmit}>
        {mode === "register" && (
          <label className="field">
            <span className="field-label">Name</span>
            <input value={form.name} onChange={set("name")} placeholder="Ali Hacker" required autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@utp.edu.my" required autoComplete="email" />
        </label>
        <label className="field">
          <span className="field-label">
            Password
            {mode === "register" && form.password && <span className={`counter strength-${score}`}>{STRENGTH[score]}</span>}
          </span>
          <div className="input-group">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="8+ characters"
              required
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password visibility">
              <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
            </button>
          </div>
          {mode === "register" && (
            <div className="meter" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < score ? `meter-on meter-${score}` : ""} />
              ))}
            </div>
          )}
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          <Icon name={busy ? "refresh" : mode === "register" ? "user" : "key"} size={16} className={busy ? "spin" : ""} />
          {busy ? "Talking to BFF…" : mode === "register" ? "Register" : "Log in & get JWT"}
        </button>
      </form>

      {result && !result.ok && (
        <Callout tone={result.notBuilt ? "warning" : "danger"} title={`${result.status || "Network"} · ${result.error}`}>
          {result.offline
            ? "Start the BFF: ./mvnw spring-boot:run in the bff folder."
            : result.notBuilt
            ? `Add @PostMapping("/${result.mode}") to AuthController (@RequestMapping("/api/auth")).`
            : result.mode === "google"
              ? "The BFF rejected the Google ID token. Check that GOOGLE_CLIENT_ID in bff/.env matches NEXT_PUBLIC_GOOGLE_CLIENT_ID."
              : result.status === 401
              ? "Generic error on purpose: we never reveal whether the email exists."
              : result.status === 409
                ? "That email is taken. Switch to Login."
                : "Check the Spring Boot console for details."}
        </Callout>
      )}
      {result?.ok && result.mode === "register" && (
        <div>
          <div className="label">Register response: notice there&apos;s no password field</div>
          <JsonView value={result.data} />
        </div>
      )}
    </Card>
  );
}

function BcryptPlayground() {
  const [password, setPassword] = useState("CodeFest2026!");
  const [cost, setCost] = useState(10);
  const [hashes, setHashes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [verdict, setVerdict] = useState(null);

  const hash = async () => {
    setBusy(true);
    const bcrypt = (await import("bcryptjs")).default;
    const started = performance.now();
    const h = await bcrypt.hash(password, cost);
    const ms = Math.round(performance.now() - started);
    setHashes((list) => [{ h, ms, cost }, ...list].slice(0, 3));
    setVerdict(null);
    setBusy(false);
  };

  const verify = async () => {
    if (!hashes[0]) return;
    const bcrypt = (await import("bcryptjs")).default;
    setVerdict(await bcrypt.compare(verifyInput, hashes[0].h));
  };

  return (
    <Card title="BCrypt playground" subtitle="Same algorithm as Spring's BCryptPasswordEncoder" icon="shield">
      <div className="field-row field-row-tight">
        <label className="field">
          <span className="field-label">Plain password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field field-narrow">
          <span className="field-label">
            Cost <span className="counter">2^{cost} rounds</span>
          </span>
          <input type="range" min={4} max={13} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </label>
      </div>
      <button type="button" className="btn btn-secondary btn-block" onClick={hash} disabled={busy || !password}>
        <Icon name={busy ? "refresh" : "shield"} size={15} className={busy ? "spin" : ""} />
        {busy ? "Hashing…" : hashes.length ? "Hash again (new salt)" : "bcrypt.hash()"}
      </button>

      {hashes.map(({ h, ms, cost: c }, i) => {
        const [, alg, rounds, rest] = h.split("$");
        return (
          <div key={h} className={`hash${i > 0 ? " hash-old" : ""}`}>
            <code className="hash-value">
              <span className="hash-alg" title="Algorithm version">${alg}$</span>
              <span className="hash-cost" title="Cost factor">{rounds}$</span>
              <span className="hash-salt" title="Random 22-char salt">{rest.slice(0, 22)}</span>
              <span className="hash-body" title="Hash">{rest.slice(22)}</span>
            </code>
            <span className="hash-meta">
              cost {c} · {ms}ms
            </span>
          </div>
        );
      })}

      {hashes.length > 0 && (
        <>
          <div className="legend">
            <span><i className="hash-alg" /> version</span>
            <span><i className="hash-cost" /> cost</span>
            <span><i className="hash-salt" /> salt</span>
            <span><i className="hash-body" /> hash</span>
          </div>
          {hashes.length > 1 && (
            <p className="tiny muted">Same password, different hash: the random salt defeats rainbow tables.</p>
          )}
          <p className="tiny muted">
            Spring writes <code>$2a$</code> instead of <code>$2b$</code>: same algorithm, and the hashes verify each other. The cost
            you set here is <code>new BCryptPasswordEncoder(cost)</code>.
          </p>
          <div className="input-group">
            <input value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} placeholder="Try a password against the latest hash" />
            <button type="button" className="btn btn-secondary" onClick={verify}>
              compare()
            </button>
          </div>
          {verdict !== null && (
            <Badge tone={verdict ? "success" : "danger"} icon={verdict ? "check" : "x"}>
              {verdict ? "Match: login would succeed" : "No match: 401"}
            </Badge>
          )}
        </>
      )}
    </Card>
  );
}

function JwtInspector() {
  const { token, googleCredential } = useWorkshop();
  const [source, setSource] = useState("session");
  const [pasted, setPasted] = useState("");
  const now = useNow(1000);

  const active = source === "session" ? token : source === "google" ? googleCredential : pasted;
  const decoded = useMemo(() => decodeJwt(active), [active]);
  const payload = decoded?.payload;
  const nowSec = now / 1000;
  const expired = payload?.exp ? payload.exp < nowSec : false;
  const lifetime = payload?.exp && payload?.iat ? payload.exp - payload.iat : null;
  const left = payload?.exp ? payload.exp - nowSec : null;

  return (
    <Card
      title="Decoded JWT Inspector"
      subtitle="Header . Payload . Signature"
      icon="key"
      actions={
        <div className="segmented segmented-sm">
          <button type="button" className={`segment${source === "session" ? " segment-active" : ""}`} onClick={() => setSource("session")}>
            Our JWT
          </button>
          {googleCredential && (
            <button type="button" className={`segment${source === "google" ? " segment-active" : ""}`} onClick={() => setSource("google")}>
              Google token
            </button>
          )}
          <button type="button" className={`segment${source === "paste" ? " segment-active" : ""}`} onClick={() => setSource("paste")}>
            Paste
          </button>
        </div>
      }
    >
      {source === "paste" && (
        <div className="paste-row">
          <textarea
            className="mono"
            rows={3}
            value={pasted}
            onChange={(e) => setPasted(e.target.value.trim())}
            placeholder="Paste any JWT (eyJhbGciOi…)"
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasted(makeDemoToken())}>
            <Icon name="sparkle" size={14} /> Load demo token
          </button>
        </div>
      )}

      {!active ? (
        <div className="empty">
          <Icon name="lock" size={28} />
          <strong>No token yet</strong>
          <p>
            Log in to receive a JWT from <code>/api/auth/login</code>, or{" "}
            <button type="button" className="link" onClick={() => { setSource("paste"); setPasted(makeDemoToken()); }}>
              inspect a demo token
            </button>
            .
          </p>
        </div>
      ) : decoded?.error ? (
        <Callout tone="danger" title="Not a valid JWT">{decoded.error}</Callout>
      ) : (
        <>
          {decoded.header?.alg === "RS256" && (
            <Callout tone="info" title="This one is signed by Google, not by us">
              RS256 uses Google&apos;s <em>private</em> key; anyone can check it with Google&apos;s public keys. That&apos;s what{" "}
              <code>GoogleIdTokenVerifier.verify()</code> does in Spring Boot before issuing our own HMAC-signed JWT.
            </Callout>
          )}
          <div className="jwt-raw">
            <span className="jwt-h">{decoded.parts[0]}</span>.<span className="jwt-p">{decoded.parts[1]}</span>.
            <span className="jwt-s">{decoded.parts[2]}</span>
          </div>
          <div className="jwt-actions">
            <CopyButton text={active} label="Copy token" />
            {payload?.exp && (
              <Badge tone={expired ? "danger" : left < 300 ? "warning" : "success"} icon="clock">
                {expired ? "Expired: server will reply 401" : `Expires in ${formatDuration(left * 1000)}`}
              </Badge>
            )}
          </div>
          {lifetime && !expired && (
            <div className="mini-progress mini-progress-wide" aria-hidden="true">
              <span style={{ width: `${Math.max(0, Math.min(100, (left / lifetime) * 100))}%` }} />
            </div>
          )}

          <div className="jwt-panels">
            <div className="jwt-panel jwt-panel-h">
              <div className="jwt-panel-head">Header</div>
              <Claims obj={decoded.header} now={nowSec} />
            </div>
            <div className="jwt-panel jwt-panel-p">
              <div className="jwt-panel-head">Payload</div>
              <Claims obj={payload} now={nowSec} />
            </div>
            <div className="jwt-panel jwt-panel-s">
              <div className="jwt-panel-head">Signature</div>
              <code className="sig-formula">
                {decoded.header?.alg === "RS256" ? "RSASHA256" : "HMACSHA256"}(
                <br />
                &nbsp;&nbsp;base64url(header) + &quot;.&quot; +
                <br />
                &nbsp;&nbsp;base64url(payload),
                <br />
                &nbsp;&nbsp;<b>{decoded.header?.alg === "RS256" ? "Google private key" : "JWT_SECRET"}</b>
                <br />)
              </code>
              {decoded.header?.alg === "RS256" ? (
                <p className="tiny">
                  Verified with Google&apos;s public keys (<code>kid</code> picks which one). The BFF also checks{" "}
                  <code>aud</code> matches your client ID.
                </p>
              ) : (
                <p className="tiny">
                  The browser can&apos;t verify this; only the server knows the secret. Change one character of
                  the payload and <code>jwtService.parse()</code> throws.
                </p>
              )}
            </div>
          </div>
          <Callout tone="warning" title="Encoded ≠ encrypted">
            Anyone holding the token can read the payload. Never put passwords or secrets in it.
          </Callout>
        </>
      )}
    </Card>
  );
}

function Claims({ obj, now }) {
  if (!obj) return null;
  return (
    <dl className="claims">
      {Object.entries(obj).map(([k, v]) => {
        const isTime = ["iat", "exp", "nbf"].includes(k) && typeof v === "number";
        return (
          <div key={k} className="claim">
            <dt>
              <code>{k}</code>
              {CLAIM_NOTES[k] && <span className="claim-note">{CLAIM_NOTES[k]}</span>}
            </dt>
            <dd>
              <code>{typeof v === "string" ? `"${v}"` : JSON.stringify(v)}</code>
              {isTime && (
                <span className="claim-time">
                  {new Date(v * 1000).toLocaleTimeString()}
                  {k === "exp" && v < now && " (expired)"}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ProtectedActions() {
  const { isAuthed, token, projects, loadProjects, deleteProject, notify } = useWorkshop();
  const [targetId, setTargetId] = useState("");
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (projects.state === "idle") loadProjects();
  }, [projects.state, loadProjects]);

  const items = projects.items;
  const chosenId = targetId || (items[0] ? String(projectId(items[0])) : "");

  const runTest = async (withToken) => {
    setBusy(withToken ? "with" : "without");
    const id = withToken ? chosenId : chosenId || FAKE_ID;
    const r = await deleteProject(id, { withToken });
    const expected = withToken ? "2xx" : "401";
    const pass = withToken ? r.ok : r.status === 401;
    setTests((t) => [{ id: Date.now(), withToken, status: r.status, expected, pass, notBuilt: r.notBuilt, error: r.error }, ...t].slice(0, 4));
    setBusy(null);
    if (withToken && r.ok) {
      notify("Deleted with a valid JWT: the guard let you through", "success");
      setTargetId("");
    }
  };

  return (
    <Card
      title="Protected actions"
      subtitle="DELETE /api/projects/[id] behind the auth guard"
      icon={isAuthed ? "unlock" : "lock"}
      tone={isAuthed ? "success" : undefined}
    >
      <div className={`lockbox${isAuthed ? " lockbox-open" : ""}`}>
        <span className="lockbox-icon">
          <Icon name={isAuthed ? "unlock" : "lock"} size={22} />
        </span>
        <div>
          <strong>{isAuthed ? "Unlocked" : "Locked"}</strong>
          <p>
            {isAuthed
              ? "Requests now carry your token in the Authorization header."
              : "Log in to attach a Bearer token. Without it the guard returns 401."}
          </p>
        </div>
      </div>

      <div className="header-preview">
        <code>
          <span className="muted">Authorization:</span>{" "}
          {token ? (
            <>
              Bearer <span className="jwt-h">{token.slice(0, 18)}</span>…
            </>
          ) : (
            <span className="muted">(not sent)</span>
          )}
        </code>
      </div>

      <div className="label">Test the guard</div>
      <div className="guard-test">
        <select value={chosenId} onChange={(e) => setTargetId(e.target.value)} disabled={items.length === 0}>
          {items.length === 0 && <option value="">No projects: uses a fake id</option>}
          {items.map((p) => (
            <option key={projectId(p)} value={String(projectId(p))}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => runTest(false)} disabled={busy !== null}>
          <Method m="DELETE" /> no token
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => runTest(true)}
          disabled={busy !== null || !isAuthed || !chosenId}
          title={!isAuthed ? "Log in first" : !chosenId ? "Create a project in Phase 2" : ""}
        >
          <Icon name="key" size={13} /> with token
        </button>
      </div>

      {tests.length > 0 && (
        <ul className="test-results">
          {tests.map((t) => (
            <li key={t.id} className={t.notBuilt ? "test-warn" : t.pass ? "test-pass" : "test-fail"}>
              <Icon name={t.notBuilt ? "alert" : t.pass ? "check" : "x"} size={14} />
              <span>{t.withToken ? "With token" : "Without token"}</span>
              <span className="muted">expected {t.expected}</span>
              <strong>got {t.status || "ERR"}</strong>
              {t.notBuilt && <span className="muted">· endpoint not mapped</span>}
              {!t.notBuilt && !t.pass && !t.withToken && t.status >= 200 && t.status < 300 && (
                <span className="test-alarm">Guard missing: anyone can delete!</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 ? (
        <div className="mini-feed">
          {items.slice(0, 5).map((p) => (
            <div key={projectId(p)} className="mini-project">
              <span className="mini-title">{p.title}</span>
              <CategoryTag category={p.category} />
              <DeleteButton project={p} compact />
            </div>
          ))}
        </div>
      ) : (
        <p className="tiny muted">
          No projects to protect yet.{" "}
          <button type="button" className="link" onClick={() => goToTab("crud")}>
            Create one in Phase 2
          </button>
          .
        </p>
      )}
    </Card>
  );
}

function AuthFlow() {
  const rows = [
    {
      label: "Register",
      steps: [
        { icon: "user", t: "{ name, email, password }", s: "Browser" },
        { icon: "shield", t: "encoder.encode(pw)", s: "AuthController" },
        { icon: "database", t: "users.save(user)", s: "MongoDB" },
        { icon: "check", t: "201 { user } (no hash)", s: "Browser" },
      ],
    },
    {
      label: "Login",
      steps: [
        { icon: "key", t: "{ email, password }", s: "Browser" },
        { icon: "shield", t: "encoder.matches(pw, hash)", s: "AuthController" },
        { icon: "zap", t: "jwtService.generate(user)", s: "JwtService" },
        { icon: "unlock", t: "200 { token }", s: "Browser" },
      ],
    },
    {
      label: "Google",
      steps: [
        { icon: "user", t: "Google popup → credential", s: "Browser" },
        { icon: "shieldCheck", t: "GoogleIdTokenVerifier.verify()", s: "AuthController" },
        { icon: "database", t: "findByGoogleId / save", s: "MongoDB" },
        { icon: "unlock", t: "200 { token } (our JWT)", s: "Browser" },
      ],
    },
    {
      label: "Protected",
      steps: [
        { icon: "key", t: "Authorization: Bearer …", s: "Browser" },
        { icon: "shieldCheck", t: "jwtService.parse(token)", s: "JwtAuthFilter" },
        { icon: "trash", t: "repo.deleteById(id)", s: "MongoDB" },
        { icon: "check", t: "200 OK, or 401", s: "Browser" },
      ],
    },
  ];
  return (
    <Card title="Auth flow" subtitle="What each route does" icon="activity">
      <div className="flow">
        {rows.map((row) => (
          <div key={row.label} className="flow-row">
            <span className="flow-label">{row.label}</span>
            <div className="flow-steps">
              {row.steps.map((step, i) => (
                <div key={i} className="flow-step-wrap">
                  <div className="flow-step">
                    <Icon name={step.icon} size={15} />
                    <code>{step.t}</code>
                    <small>{step.s}</small>
                  </div>
                  {i < row.steps.length - 1 && <Icon name="arrowRight" size={14} className="flow-arrow" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AuthTab() {
  const { isAuthed } = useWorkshop();

  return (
    <div className="tab-panel">
      <PhaseHeader
        phase={PHASE}
        title="Auth & JWT Vault"
        lead="Two providers, one JWT. Local: BCrypt-hash on register, match and sign on login. Google: verify Google's ID token in Spring Boot, then issue the same JWT. One servlet filter guards every protected endpoint."
        files={[
          "user/User.java",
          "user/UserRepository.java",
          "auth/JwtService.java",
          "auth/AuthController.java",
          "auth/JwtAuthFilter.java",
        ]}
      />

      <WhyPhase
        goal="Know who is calling, and only let signed-in users change data."
        reasons={[
          {
            icon: "shield",
            title: "Why hash with BCrypt?",
            text: "Never store passwords, only hashes. BCrypt is deliberately slow and adds a random salt to every hash, so a leaked database can't be reversed with lookup tables, and cracking each password takes real time.",
          },
          {
            icon: "key",
            title: "Why a JWT?",
            text: "A JWT is a signed, self-contained pass. The BFF can verify it on every request with just the secret, with no session table and no database lookup. That keeps the BFF stateless, so it restarts and scales freely.",
          },
          {
            icon: "user",
            title: "Why two providers but one token?",
            text: "Google proves who the user is; then the BFF issues its own JWT. Protected endpoints only ever verify one kind of token, so adding GitHub or Microsoft later never touches them.",
          },
          {
            icon: "shieldCheck",
            title: "Why a filter instead of checks in each controller?",
            text: "JwtAuthFilter runs before any controller. Protection lives in one place, so you can't forget it on a new endpoint, and controllers stay focused on business logic.",
          },
        ]}
        analogy="A JWT is a festival wristband. Security checks your ID once at the gate (login) and gives you a tamper-proof band. After that, staff at each stage just glance at the band (verify the signature) instead of checking your ID again."
        pitfalls={[
          "Putting secrets in the JWT payload: it's only base64, anyone can read it",
          "Different errors for \"no such user\" and \"wrong password\" (leaks which emails exist)",
          "JWT_SECRET shorter than 32 bytes: jjwt throws WeakKeyException at startup",
          "Skipping Google's audience check: tokens issued to other apps would log in",
        ]}
      />

      <AuthFlow />

      <div className="grid grid-auth">
        <div className="stack">
          <AuthForms />
          <BcryptPlayground />
        </div>
        <div className="stack">
          <JwtInspector />
          <ProtectedActions />
        </div>
      </div>

      <div className="grid grid-main">
        <Card title="API contract" subtitle="Routes this tab calls" icon="file">
          <EndpointRow method="POST" path="/api/auth/register" desc="{ name, email, password } → { user }" status="201 / 400 / 409" />
          <EndpointRow method="POST" path="/api/auth/login" desc="{ email, password } → { token, user }" status="200 / 401" />
          <EndpointRow method="POST" path="/api/auth/google" desc="{ credential } → { token, user }" status="200 / 401" />
          <EndpointRow method="DELETE" path="/api/projects/{id}" desc="Requires a valid JWT" auth status="200 / 401 / 404" />
          <div className="contract-note">
            <span>BFF env vars:</span> <code>JWT_SECRET</code> (32+ bytes), <code>JWT_EXPIRATION_MINUTES</code>,{" "}
            <code>GOOGLE_CLIENT_ID</code> (audience check). <span>Frontend:</span> <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
            (same value, renders the button).
          </div>
        </Card>
        <LiveCodeSteps
          id="phase3"
          steps={[
            {
              title: "Add spring-security-crypto, jjwt and google-api-client to pom.xml",
              why: "spring-security-crypto gives BCrypt without switching on the whole Spring Security filter chain, which keeps the workshop focused on the concepts.",
            },
            {
              title: "User @Document: @JsonIgnore passwordHash, sparse unique googleId",
              detail: "UserRepository with findByEmail / findByGoogleId / existsByEmail.",
              why: "One users collection serves both providers. @JsonIgnore guarantees the hash can never be serialised into a response, even by accident.",
            },
            {
              title: "JwtService: generate(user, provider) and parse(token)",
              why: "Only one class knows the secret. Everything else asks it to sign or verify, so rotating the secret or changing the algorithm happens in one file.",
            },
            {
              title: "AuthController /register and /login",
              detail: "encoder.encode() on register (201, no hash); encoder.matches() on login → generic 401.",
              why: "BCrypt's matches() re-hashes with the stored salt, so you never decrypt anything. The identical error message stops attackers from discovering registered emails.",
            },
            {
              title: "AuthController /google: GoogleIdTokenVerifier → find or create → generate",
              why: "verify() checks Google's signature, expiry and audience (your client ID). Only then do we trust the email and mint our own JWT.",
            },
            {
              title: "JwtAuthFilter guards DELETE /api/projects/**",
              why: "The filter rejects requests with a missing or invalid token with 401 before the controller runs. Use \"DELETE no token\" above to prove it.",
            },
            {
              title: "Log in: the token decodes and delete unlocks",
              done: isAuthed,
              why: "The UI now attaches Authorization: Bearer <token>, and the filter lets it through.",
            },
          ]}
        />
      </div>

      <Collapsible title="Presenter cheat sheet: File 3" subtitle="User, JwtService, AuthController (local + Google), JwtAuthFilter" icon="key">
        <div className="stack">
          <CodeBlock filename="user/User.java" code={USER_ENTITY} />
          <CodeBlock filename="user/UserRepository.java" code={USER_REPOSITORY} />
          <CodeBlock filename="auth/JwtService.java" code={JWT_SERVICE} />
          <CodeBlock filename="auth/AuthController.java" code={AUTH_CONTROLLER} />
          <CodeBlock filename="auth/JwtAuthFilter.java" code={JWT_FILTER} />
          <Callout tone="info" title="DELETE endpoint">
            <code>@DeleteMapping(&quot;/{"{id}"}&quot;)</code> is already in the Phase 2 <code>ProjectController</code>; the filter is what
            protects it.
          </Callout>
        </div>
      </Collapsible>
    </div>
  );
}
