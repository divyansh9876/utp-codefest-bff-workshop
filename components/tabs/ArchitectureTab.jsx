"use client";

import { useState } from "react";
import Icon from "../Icon";
import { useWorkshop } from "../WorkshopProvider";
import {
  Badge,
  Callout,
  Card,
  CodeBlock,
  Collapsible,
  EndpointRow,
  JsonView,
  LiveCodeSteps,
  PhaseHeader,
} from "../ui";
import { PHASES } from "@/lib/constants";
import { ENV_LOCAL, HEALTH_ROUTE, MONGODB_JS } from "@/lib/snippets";
import { timeAgo, useNow } from "@/lib/hooks";

const PHASE = PHASES[0];

const NODES = [
  {
    id: "client",
    icon: "monitor",
    title: "Client",
    sub: "React UI (this page)",
    file: "fetch('/api/health')",
    where: "Browser",
  },
  {
    id: "bff",
    icon: "server",
    title: "BFF Route Handler",
    sub: "Validates, authorises, shapes JSON",
    file: "app/api/health/route.js",
    where: "Server · Node.js",
  },
  {
    id: "service",
    icon: "layers",
    title: "Service / Data layer",
    sub: "Cached Mongoose connection",
    file: "lib/mongodb.js",
    where: "Server · Node.js",
  },
  {
    id: "db",
    icon: "database",
    title: "MongoDB Atlas",
    sub: "Managed cloud cluster",
    file: "mongodb+srv://…",
    where: "Cloud",
  },
];

const STATUS_COPY = {
  idle: { tone: "neutral", label: "Not checked", text: "Click Ping Database to send GET /api/health through the BFF." },
  checking: { tone: "info", label: "Pinging…", text: "Request in flight: Browser → Route Handler → MongoDB Atlas." },
  connected: { tone: "success", label: "Connected", text: "The BFF reached MongoDB Atlas and answered the browser." },
  notbuilt: {
    tone: "warning",
    label: "Route missing",
    text: "Next.js returned its 404 page. Create app/api/health/route.js and export a GET function.",
  },
  error: {
    tone: "danger",
    label: "Disconnected",
    text: "The route exists but couldn't reach the database.",
  },
};

function nodeState(nodeId, dbState) {
  if (dbState === "checking") return "active";
  if (dbState === "connected") return "ok";
  if (dbState === "notbuilt") return nodeId === "client" ? "ok" : nodeId === "bff" ? "warn" : "idle";
  if (dbState === "error") return nodeId === "db" || nodeId === "service" ? "err" : "ok";
  return "idle";
}

function Diagram({ dbState }) {
  return (
    <div className="diagram">
      <div className="diagram-row">
        {NODES.map((node, i) => {
          const state = nodeState(node.id, dbState);
          return (
            <div key={node.id} className="diagram-cell">
              <div className={`node node-${state}`}>
                <span className="node-where">{node.where}</span>
                <span className="node-icon">
                  <Icon name={node.icon} size={22} />
                </span>
                <strong className="node-title">{node.title}</strong>
                <span className="node-sub">{node.sub}</span>
                <code className="node-file">{node.file}</code>
              </div>
              {i < NODES.length - 1 && (
                <div className={`arrow${dbState === "checking" ? " arrow-flow" : ""}${i === 0 ? " arrow-boundary" : ""}`}>
                  <span className="arrow-line" />
                  <span className="arrow-label">{["HTTP · JSON", "import", "TCP · TLS"][i]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="trust">
        <span className="trust-left">Public: anyone can read this code in DevTools</span>
        <span className="trust-line">trust boundary</span>
        <span className="trust-right">
          <Icon name="lock" size={12} /> Private: <code>MONGODB_URI</code>, <code>JWT_SECRET</code> stay on the server
        </span>
      </div>
    </div>
  );
}

function PingPanel() {
  const { db, pingDb, notify } = useWorkshop();
  const now = useNow(5000, Boolean(db.at));
  const copy = STATUS_COPY[db.state];

  const onPing = async () => {
    const state = await pingDb();
    if (state === "connected") notify("MongoDB Atlas connected — badge is green!", "success");
    else if (state === "notbuilt") notify("GET /api/health isn't built yet", "warning");
    else notify("Health check failed — see the hints", "danger");
  };

  return (
    <Card
      title="Database status"
      subtitle="Live call to GET /api/health"
      icon="activity"
      className="ping-card"
      tone={copy.tone === "success" ? "success" : undefined}
    >
      <div className={`ping-hero ping-${db.state}`}>
        <div className="ping-orb" aria-hidden="true">
          <Icon name="database" size={30} />
        </div>
        <div className="ping-info">
          <Badge tone={copy.tone} dot pulse={db.state === "checking" || db.state === "connected"}>
            {copy.label}
          </Badge>
          <p>{copy.text}</p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={onPing}
        disabled={db.state === "checking"}
      >
        <Icon name={db.state === "checking" ? "refresh" : "zap"} size={18} className={db.state === "checking" ? "spin" : ""} />
        {db.state === "checking" ? "Pinging database…" : "Ping Database"}
      </button>

      <dl className="stats">
        <div>
          <dt>HTTP</dt>
          <dd>{db.status ?? "—"}</dd>
        </div>
        <div>
          <dt>Round trip</dt>
          <dd>{db.ms != null ? `${db.ms} ms` : "—"}</dd>
        </div>
        <div>
          <dt>Database</dt>
          <dd>{db.data?.dbName || db.data?.database || "—"}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{db.at ? timeAgo(db.at, now) : "—"}</dd>
        </div>
      </dl>

      {db.history.length > 0 && (
        <div className="ping-history" title="Recent pings">
          {db.history.map((h, i) => (
            <span key={i} className={`ping-dot ping-dot-${h.state}`} title={`${h.state} · ${h.ms}ms`} />
          ))}
        </div>
      )}

      {db.state === "error" && (
        <Callout tone="danger" title={db.error}>
          <ul className="hint-list">
            <li>
              Is <code>MONGODB_URI</code> set in <code>.env.local</code>? Restart <code>npm run dev</code> after editing it.
            </li>
            <li>Atlas → Network Access: is your current IP (or 0.0.0.0/0) allowed?</li>
            <li>Did you URL-encode special characters in the DB password?</li>
          </ul>
        </Callout>
      )}

      <div className="label">Response body</div>
      <JsonView value={db.state === "notbuilt" ? null : db.data} empty={db.state === "notbuilt" ? "404 — route.js not found" : "Ping to see the JSON your BFF returns"} />
    </Card>
  );
}

function HotReloadSimulator() {
  const [saves, setSaves] = useState(0);
  const withoutCache = saves + 1;
  const LIMIT = 24;
  const exhausted = withoutCache >= LIMIT;

  return (
    <Card
      title="Why cache the connection?"
      subtitle="Every file save in dev re-runs your modules"
      icon="refresh"
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSaves((s) => s + 1)} disabled={exhausted}>
            <Icon name="file" size={14} /> Save file (Cmd+S)
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSaves(0)}>
            <Icon name="reset" size={14} />
          </button>
        </>
      }
    >
      <div className="sim">
        <div className={`sim-col${exhausted ? " sim-bad" : ""}`}>
          <div className="sim-head">
            <span>Without caching</span>
            <Badge tone={exhausted ? "danger" : withoutCache > 6 ? "warning" : "neutral"}>
              {withoutCache} {withoutCache === 1 ? "pool" : "pools"}
            </Badge>
          </div>
          <code className="sim-code">await mongoose.connect(uri) // every reload</code>
          <div className="pool-grid">
            {Array.from({ length: LIMIT }, (_, i) => (
              <span key={i} className={`pool${i < withoutCache ? " pool-on pool-bad" : ""}`} />
            ))}
          </div>
          <p className="sim-note">
            {exhausted
              ? "Atlas connection limit hit — new requests start failing."
              : "Each hot reload opens a brand-new connection pool. Old ones are never closed."}
          </p>
        </div>
        <div className="sim-col sim-good">
          <div className="sim-head">
            <span>With global cache</span>
            <Badge tone="success">1 pool</Badge>
          </div>
          <code className="sim-code">global.mongoose ??= {"{ conn, promise }"}</code>
          <div className="pool-grid">
            {Array.from({ length: LIMIT }, (_, i) => (
              <span key={i} className={`pool${i === 0 ? " pool-on pool-good" : ""}`} />
            ))}
          </div>
          <p className="sim-note">
            <code>global</code> survives hot reloads, so every request reuses the same pool. {saves > 0 && `${saves} saves, still 1 pool.`}
          </p>
        </div>
      </div>
      <p className="tiny muted">Illustration only: pool counts are simplified to show the pattern.</p>
    </Card>
  );
}

export default function ArchitectureTab() {
  const { db } = useWorkshop();

  return (
    <div className="tab-panel">
      <PhaseHeader
        phase={PHASE}
        title="Architecture & DB Status"
        lead="A Backend-for-Frontend is a thin server layer owned by the frontend team. The browser only talks to your own /api routes; the BFF holds the secrets, talks to the database, and returns exactly the JSON the UI needs."
        files={["lib/mongodb.js", "app/api/health/route.js"]}
      />

      <Card title="Request flow" subtitle="Client → BFF Route Handler → Service / DB" icon="layers">
        <Diagram dbState={db.state} />
      </Card>

      <div className="grid grid-3 why-grid">
        <div className="why">
          <Icon name="lock" size={18} />
          <strong>Secrets stay server-side</strong>
          <p>DB credentials and JWT secrets never ship to the browser bundle.</p>
        </div>
        <div className="why">
          <Icon name="layers" size={18} />
          <strong>Shaped for the UI</strong>
          <p>One request returns exactly what a screen needs. No over-fetching, no leaking internal fields.</p>
        </div>
        <div className="why">
          <Icon name="zap" size={18} />
          <strong>Same origin, no CORS</strong>
          <p>UI and API deploy together on one domain. One repo, one deploy, one URL.</p>
        </div>
      </div>

      <div className="grid grid-main">
        <div className="stack">
          <HotReloadSimulator />
          <Card title="API contract" subtitle="What this tab expects from your BFF" icon="file">
            <EndpointRow method="GET" path="/api/health" desc="Connects (cached) and pings MongoDB" status="200 / 503" />
            <JsonView
              value={{ status: "ok", db: "connected", dbName: "codefest", latencyMs: 42 }}
            />
          </Card>
        </div>
        <div className="stack">
          <PingPanel />
          <LiveCodeSteps
            id="phase1"
            steps={[
              { title: "Create a free M0 cluster on MongoDB Atlas", detail: "Add a DB user and allow your IP under Network Access." },
              { title: "Paste the connection string into .env.local", detail: "MONGODB_URI=mongodb+srv://… then restart next dev." },
              { title: "Write lib/mongodb.js with a global connection cache", detail: "Reuse one connection across hot reloads." },
              { title: "Create app/api/health/route.js", detail: "export async function GET() — connect, ping, return JSON." },
              { title: "Click Ping Database — badge turns green", done: db.state === "connected" },
            ]}
          />
        </div>
      </div>

      <Collapsible title="Presenter cheat sheet: File 1" subtitle="Reference solution, in case live-coding goes off the rails" icon="key">
        <div className="stack">
          <CodeBlock filename=".env.local" code={ENV_LOCAL} />
          <CodeBlock filename="lib/mongodb.js" code={MONGODB_JS} />
          <CodeBlock filename="app/api/health/route.js" code={HEALTH_ROUTE} />
        </div>
      </Collapsible>
    </div>
  );
}
