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
  WhyPhase,
} from "../ui";
import { PHASES } from "@/lib/constants";
import {
  APPLICATION_YML,
  BFF_ENV,
  CORS_CONFIG,
  HEALTH_CONTROLLER,
  INITIALIZR_URL,
  NEXT_PROXY,
  POM_DEPS,
} from "@/lib/snippets";
import { timeAgo, useNow } from "@/lib/hooks";

const PHASE = PHASES[0];

const NODES = [
  {
    id: "client",
    icon: "monitor",
    title: "Client",
    sub: "Next.js UI (this page)",
    file: "fetch('/api/health')",
    where: "Browser",
  },
  {
    id: "bff",
    icon: "server",
    title: "Spring Boot BFF",
    sub: "@RestController: validate, auth, shape JSON",
    file: "HealthController.java",
    where: "Server · JVM :8080",
  },
  {
    id: "service",
    icon: "layers",
    title: "Service / Data layer",
    sub: "@Service + Spring Data (pooled MongoClient)",
    file: "MongoTemplate / MongoRepository",
    where: "Server · JVM",
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
  checking: { tone: "info", label: "Pinging…", text: "Request in flight: Browser → Next.js proxy → Spring Boot → MongoDB Atlas." },
  connected: { tone: "success", label: "Connected", text: "Spring Boot reached MongoDB Atlas and answered the browser." },
  offline: {
    tone: "danger",
    label: "BFF offline",
    text: "The Next.js proxy couldn't reach Spring Boot. Start it with ./mvnw spring-boot:run (port 8080) or check BFF_URL.",
  },
  notbuilt: {
    tone: "warning",
    label: "Endpoint missing",
    text: "Spring Boot is running but nothing is mapped to /api/health yet. Add HealthController with @GetMapping(\"/api/health\").",
  },
  error: {
    tone: "danger",
    label: "Disconnected",
    text: "The endpoint exists but couldn't reach the database.",
  },
};

function nodeState(nodeId, dbState) {
  if (dbState === "checking") return "active";
  if (dbState === "connected") return "ok";
  if (dbState === "offline") return nodeId === "client" ? "ok" : nodeId === "bff" ? "err" : "idle";
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
                <div className={`arrow${dbState === "checking" ? " arrow-flow" : ""}`}>
                  <span className="arrow-line" />
                  <span className="arrow-label">{["/api proxy", "inject", "TCP · TLS"][i]}</span>
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
          <Icon name="lock" size={12} /> Private: <code>MONGODB_URI</code>, <code>JWT_SECRET</code> live only in Spring Boot&apos;s env
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
    else if (state === "offline") notify("Spring Boot BFF isn't running", "danger");
    else if (state === "notbuilt") notify("GET /api/health isn't mapped yet", "warning");
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
      <div className={`ping-hero ping-${db.state === "offline" ? "error" : db.state}`}>
        <div className="ping-orb" aria-hidden="true">
          <Icon name={db.state === "offline" ? "server" : "database"} size={30} />
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

      {db.state === "offline" && (
        <Callout tone="danger" title="Start the BFF">
          <ul className="hint-list">
            <li>
              In the <code>bff</code> folder: <code>./mvnw spring-boot:run</code> (or Run in IntelliJ).
            </li>
            <li>
              It should log <code>Tomcat started on port 8080</code>. If it runs elsewhere, set <code>BFF_URL</code> in the
              frontend&apos;s <code>.env.local</code> and restart <code>npm run dev</code>.
            </li>
          </ul>
        </Callout>
      )}

      {db.state === "error" && (
        <Callout tone="danger" title={db.error}>
          <ul className="hint-list">
            <li>
              Is <code>MONGODB_URI</code> set in <code>bff/.env</code>? Restart Spring Boot after editing it.
            </li>
            <li>Atlas → Network Access: is your current IP (or 0.0.0.0/0) allowed?</li>
            <li>Did you URL-encode special characters in the DB password?</li>
          </ul>
        </Callout>
      )}

      <div className="label">Response body</div>
      <JsonView
        value={db.state === "notbuilt" || db.state === "offline" ? null : db.data}
        empty={
          db.state === "notbuilt"
            ? "404: no controller mapped to /api/health"
            : db.state === "offline"
              ? "No response: Spring Boot isn't running"
              : "Ping to see the JSON your BFF returns"
        }
      />
    </Card>
  );
}

function ConnectionSimulator() {
  const [requests, setRequests] = useState(0);
  const LIMIT = 24;
  const leaked = Math.min(requests, LIMIT);
  const exhausted = requests >= LIMIT;

  return (
    <Card
      title="Why one MongoClient bean?"
      subtitle="What happens per request with and without dependency injection"
      icon="refresh"
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRequests((s) => s + 1)} disabled={exhausted}>
            <Icon name="zap" size={14} /> Send request
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRequests(0)}>
            <Icon name="reset" size={14} />
          </button>
        </>
      }
    >
      <div className="sim">
        <div className={`sim-col${exhausted ? " sim-bad" : ""}`}>
          <div className="sim-head">
            <span>new MongoClient() per request</span>
            <Badge tone={exhausted ? "danger" : leaked > 6 ? "warning" : "neutral"}>
              {leaked} {leaked === 1 ? "client" : "clients"}
            </Badge>
          </div>
          <code className="sim-code">MongoClients.create(uri) // inside the controller</code>
          <div className="pool-grid">
            {Array.from({ length: LIMIT }, (_, i) => (
              <span key={i} className={`pool${i < leaked ? " pool-on pool-bad" : ""}`} />
            ))}
          </div>
          <p className="sim-note">
            {exhausted
              ? "Atlas connection limit hit — new requests start failing."
              : "Every request pays a fresh TLS handshake to Atlas (100–300 ms) and leaks a pool if you forget to close it."}
          </p>
        </div>
        <div className="sim-col sim-good">
          <div className="sim-head">
            <span>Spring-managed bean</span>
            <Badge tone="success">1 client</Badge>
          </div>
          <code className="sim-code">public HealthController(MongoTemplate mongo)</code>
          <div className="pool-grid">
            {Array.from({ length: LIMIT }, (_, i) => (
              <span key={i} className={`pool${i === 0 ? " pool-on pool-good" : ""}`} />
            ))}
          </div>
          <p className="sim-note">
            Spring Boot creates one pooled client at startup and injects it everywhere. DevTools restarts close the old one
            cleanly. {requests > 0 && `${requests} requests, still 1 client.`}
          </p>
        </div>
      </div>
      <p className="tiny muted">Illustration only: counts are simplified to show the pattern.</p>
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
        lead="A Backend-for-Frontend is a server layer built specifically for one frontend. Our UI is Next.js; our BFF is Spring Boot. The browser only calls /api/* on its own origin, Next.js forwards that to Spring Boot, and Spring Boot holds the secrets and talks to MongoDB Atlas."
        files={["pom.xml", "application.yml", "bff/.env", "health/HealthController.java"]}
      />

      <WhyPhase
        goal="Prove the whole chain works, browser → BFF → database, before writing a single feature."
        reasons={[
          {
            icon: "shield",
            title: "Why a BFF at all?",
            text: "If the browser talked to MongoDB directly, the DB password would ship to every visitor. The BFF is the only thing the browser can reach: it owns the secrets, enforces the rules, and returns exactly the JSON each screen needs.",
          },
          {
            icon: "coffee",
            title: "Why Spring Boot for the BFF?",
            text: "Starters + auto-configuration give you a production-grade web server, JSON, validation and a MongoDB connection pool from a few dependencies. Strong typing and DI scale well when your hackathon project grows into a real product.",
          },
          {
            icon: "activity",
            title: "Why start with /api/health?",
            text: "It answers \"is it the code, the config, or the network?\" in one click. You'll reuse the same endpoint as Render's health check in Phase 4, so it pays for itself twice.",
          },
          {
            icon: "layers",
            title: "Why proxy /api through Next.js?",
            text: "The browser sees a single origin, so there's no CORS to configure, cookies just work, and the Spring Boot URL can change (localhost → Render) without touching frontend code.",
          },
        ]}
        analogy="The BFF is a waiter. Customers (browsers) never walk into the kitchen (database). They order from the waiter, who knows the kitchen's rules and brings back exactly the dish that was asked for."
        pitfalls={[
          "Atlas Network Access doesn't include your IP → connection timeouts",
          "Special characters in the DB password not URL-encoded in MONGODB_URI",
          "Editing .env without restarting Spring Boot",
          "Spring Boot not running → the UI shows \"BFF offline\"",
        ]}
      />

      <Card title="Request flow" subtitle="Client → BFF (Spring Boot) → Service / DB" icon="layers">
        <Diagram dbState={db.state} />
      </Card>

      <div className="grid grid-3 why-grid">
        <div className="why">
          <Icon name="lock" size={18} />
          <strong>Secrets stay server-side</strong>
          <p>DB credentials and the JWT secret live in Spring Boot&apos;s environment. The frontend has no secrets at all.</p>
        </div>
        <div className="why">
          <Icon name="layers" size={18} />
          <strong>Shaped for the UI</strong>
          <p>DTOs return exactly what a screen needs. No over-fetching, no internal fields like password hashes.</p>
        </div>
        <div className="why">
          <Icon name="zap" size={18} />
          <strong>One origin via proxy</strong>
          <p>
            <code>next.config.mjs</code> rewrites <code>/api/*</code> to Spring Boot, so the browser never makes a cross-origin call.
          </p>
        </div>
      </div>

      <div className="grid grid-main">
        <div className="stack">
          <ConnectionSimulator />
          <Card title="How /api reaches Spring Boot" subtitle="Already set up in the frontend" icon="arrowRight">
            <CodeBlock filename="next.config.mjs" code={NEXT_PROXY} compact />
            <p className="tiny muted">
              Locally <code>BFF_URL</code> defaults to <code>http://localhost:8080</code>. On Render you set it to the Spring Boot
              service&apos;s URL. It&apos;s read at build time, so rebuild the frontend after changing it.
            </p>
          </Card>
          <Card title="API contract" subtitle="What this tab expects from your BFF" icon="file">
            <EndpointRow method="GET" path="/api/health" desc="Pings MongoDB through the injected MongoTemplate" status="200 / 503" />
            <JsonView value={{ status: "ok", db: "connected", dbName: "codefest", latencyMs: 42 }} />
          </Card>
        </div>
        <div className="stack">
          <PingPanel />
          <LiveCodeSteps
            id="phase1"
            steps={[
              {
                title: "Generate the project on start.spring.io",
                detail: "Maven · Java 21 · Spring Boot 4.1 · Spring Web, Spring Data MongoDB, Validation, DevTools.",
                why: "Initializr gives you a build where every dependency version already works together. Each starter bundles libraries and auto-configuration, so you write features instead of setup.",
              },
              {
                title: "Create a free M0 cluster on MongoDB Atlas",
                detail: "Add a database user and allow your IP under Network Access.",
                why: "A managed cluster means no local database install for 100 attendees, and the same database works from your laptop and from Render.",
              },
              {
                title: "Put MONGODB_URI in bff/.env, reference it in application.yml",
                detail: "spring.mongodb.uri: ${MONGODB_URI}",
                why: "application.yml is committed to git; .env is not. Placeholders keep secrets out of the repo, and the same jar runs locally or on Render with different env vars.",
              },
              {
                title: "Write HealthController with GET /api/health",
                detail: "Inject MongoTemplate, run { ping: 1 }, return JSON.",
                why: "Constructor injection hands you Spring's single pooled MongoClient, so you never manage connections by hand. The ping proves credentials, network and driver all work.",
              },
              {
                title: "./mvnw spring-boot:run, then click Ping Database",
                done: db.state === "connected",
                why: "A green badge here means every layer in the diagram is wired correctly. Every later phase builds on this.",
              },
            ]}
          />
        </div>
      </div>

      <Collapsible title="Presenter cheat sheet: File 1" subtitle="Reference solution, in case live-coding goes off the rails" icon="key">
        <div className="stack">
          <Callout tone="info" title="Generate the project">
            <a href={INITIALIZR_URL} target="_blank" rel="noreferrer">
              Open start.spring.io pre-filled
            </a>{" "}
            (group <code>com.utp.codefest</code>, artifact <code>bff</code>), then unzip it next to the frontend.
          </Callout>
          <CodeBlock filename="pom.xml (dependencies)" code={POM_DEPS} />
          <CodeBlock filename="bff/.env" code={BFF_ENV} />
          <CodeBlock filename="src/main/resources/application.yml" code={APPLICATION_YML} />
          <CodeBlock filename="health/HealthController.java" code={HEALTH_CONTROLLER} />
          <Callout tone="warning" title="Skip CorsConfig when using the proxy" icon="alert">
            Next.js forwards the browser&apos;s <code>Origin</code> header. If <code>CorsConfig</code> exists and the frontend&apos;s exact
            origin isn&apos;t listed, Spring answers POST/DELETE with <strong>403 Invalid CORS request</strong> while GETs keep working.
          </Callout>
          <CodeBlock filename="common/CorsConfig.java (only if you skip the proxy)" code={CORS_CONFIG} />
        </div>
      </Collapsible>
    </div>
  );
}
