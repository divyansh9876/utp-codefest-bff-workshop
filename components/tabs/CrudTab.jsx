"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { useWorkshop } from "../WorkshopProvider";
import {
  Badge,
  Callout,
  Card,
  CodeBlock,
  Collapsible,
  EndpointRow,
  LiveCodeSteps,
  PhaseHeader,
} from "../ui";
import { CATEGORIES, CATEGORY_COLORS, PHASES, SAMPLE_PROJECTS } from "@/lib/constants";
import { PROJECTS_ROUTE, PROJECT_MODEL } from "@/lib/snippets";
import { goToTab, timeAgo, useNow } from "@/lib/hooks";
import { projectId } from "@/lib/api";

const PHASE = PHASES[1];
const EMPTY_FORM = { title: "", description: "", category: CATEGORIES[0], teamName: "", repoUrl: "" };

const SCHEMA_FIELDS = [
  { name: "title", type: "String", rules: "required · trim · max 80" },
  { name: "description", type: "String", rules: "required · trim · max 500" },
  { name: "category", type: "String", rules: "required · enum" },
  { name: "teamName", type: "String", rules: "optional · max 60" },
  { name: "repoUrl", type: "String", rules: "optional" },
  { name: "_id", type: "ObjectId", rules: "auto", auto: true },
  { name: "createdAt / updatedAt", type: "Date", rules: "timestamps: true", auto: true },
];

export function CategoryTag({ category }) {
  return <span className={`tag tag-${CATEGORY_COLORS[category] || "slate"}`}>{category || "Uncategorised"}</span>;
}

export function DeleteButton({ project, compact = false }) {
  const { isAuthed, deleteProject, notify } = useWorkshop();
  const [busy, setBusy] = useState(false);
  const id = projectId(project);

  if (!isAuthed) {
    return (
      <button
        type="button"
        className="btn btn-locked btn-xs"
        title="Protected action: log in on Tab 3 to unlock"
        onClick={() => {
          notify("Delete is protected. Log in on Tab 3 to get a JWT.", "warning");
        }}
      >
        <Icon name="lock" size={12} />
        {!compact && "Locked"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-danger-soft btn-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await deleteProject(id);
        setBusy(false);
        if (r.ok) notify(`Deleted "${project.title}"`, "success");
        else if (r.notBuilt) notify("DELETE /api/projects/[id] isn't built yet", "warning");
        else notify(r.error || "Delete failed", "danger");
      }}
    >
      <Icon name="trash" size={12} />
      {!compact && (busy ? "Deleting…" : "Delete")}
    </button>
  );
}

function ProjectForm() {
  const { createProject, notify } = useWorkshop();
  const [form, setForm] = useState(EMPTY_FORM);
  const [skipValidation, setSkipValidation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [sampleIndex, setSampleIndex] = useState(0);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const fillSample = () => {
    setForm(SAMPLE_PROJECTS[sampleIndex % SAMPLE_PROJECTS.length]);
    setSampleIndex((i) => i + 1);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
    const r = await createProject(body);
    setBusy(false);
    setResult(r);
    if (r.ok) {
      notify(`"${form.title || "Project"}" saved to MongoDB`, "success");
      setForm(EMPTY_FORM);
    } else if (r.notBuilt) {
      notify("POST /api/projects isn't built yet", "warning");
    } else {
      notify(r.error || "Submit failed", "danger");
    }
  };

  return (
    <Card
      title="Submit a hackathon project"
      subtitle="POST /api/projects"
      icon="plus"
      actions={
        <button type="button" className="btn btn-ghost btn-sm" onClick={fillSample}>
          <Icon name="sparkle" size={14} /> Fill sample
        </button>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate={skipValidation}>
        <label className="field">
          <span className="field-label">
            Project title <span className="req">*</span>
            <span className="counter">{form.title.length}/80</span>
          </span>
          <input value={form.title} onChange={set("title")} placeholder="e.g. CampusEats" required maxLength={skipValidation ? undefined : 80} />
        </label>

        <label className="field">
          <span className="field-label">
            Description <span className="req">*</span>
            <span className="counter">{form.description.length}/500</span>
          </span>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="What problem does it solve? Who is it for?"
            rows={4}
            required
            maxLength={skipValidation ? undefined : 500}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">
              Category <span className="req">*</span>
            </span>
            <select value={form.category} onChange={set("category")} required>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Team name</span>
            <input value={form.teamName} onChange={set("teamName")} placeholder="e.g. Null Pointers" />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Repo URL</span>
          <input type="url" value={form.repoUrl} onChange={set("repoUrl")} placeholder="https://github.com/…" />
        </label>

        <label className="toggle">
          <input type="checkbox" checked={skipValidation} onChange={(e) => setSkipValidation(e.target.checked)} />
          <span>
            Skip browser validation <small>to prove the server validates too (expect 400)</small>
          </span>
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          <Icon name={busy ? "refresh" : "arrowRight"} size={16} className={busy ? "spin" : ""} />
          {busy ? "Sending to BFF…" : "Submit project"}
        </button>
      </form>

      {result && !result.ok && (
        <Callout tone={result.notBuilt ? "warning" : "danger"} title={`${result.status || "Network"} · ${result.error}`}>
          {result.notBuilt
            ? "Create models/Project.js and app/api/projects/route.js with a POST export."
            : result.status === 400
              ? "Validation is working — the BFF rejected bad input before it hit the database."
              : "Check the terminal running next dev for the stack trace."}
        </Callout>
      )}
      {result?.ok && (
        <Callout tone="success" title={`${result.status} Created in ${result.ms}ms`}>
          The project was saved to MongoDB and returned with its new <code>_id</code>.
        </Callout>
      )}
    </Card>
  );
}

function ProjectFeed() {
  const { projects, loadProjects } = useWorkshop();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const now = useNow(15000);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => loadProjects({ silent: true }), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, loadProjects]);

  const categories = useMemo(
    () => ["All", ...new Set(projects.items.map((p) => p.category).filter(Boolean))],
    [projects.items],
  );

  const visible = projects.items.filter((p) => {
    if (filter !== "All" && p.category !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [p.title, p.description, p.teamName].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <Card
      title="Live project feed"
      subtitle="GET /api/projects"
      icon="layers"
      actions={
        <>
          <label className="toggle toggle-inline">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto 5s</span>
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadProjects()}>
            <Icon name="refresh" size={14} className={projects.state === "loading" ? "spin" : ""} /> Refresh
          </button>
        </>
      }
    >
      {projects.state === "notbuilt" && (
        <div className="empty">
          <Icon name="file" size={28} />
          <strong>GET /api/projects isn&apos;t built yet</strong>
          <p>
            Live-code <code>models/Project.js</code> and <code>app/api/projects/route.js</code>, then hit Refresh.
          </p>
        </div>
      )}

      {projects.state === "error" && (
        <Callout tone="danger" title={projects.error}>
          Is the database connected? Check the badge on Tab 1.
        </Callout>
      )}

      {projects.state === "loading" && (
        <div className="feed">
          {[0, 1, 2].map((i) => (
            <div key={i} className="project skeleton" />
          ))}
        </div>
      )}

      {projects.state === "ready" && (
        <>
          <div className="feed-tools">
            <div className="search">
              <Icon name="search" size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" />
            </div>
            <div className="chips">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${filter === c ? " chip-active" : ""}`}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <Icon name="layers" size={28} />
              <strong>{projects.items.length === 0 ? "No projects yet" : "Nothing matches"}</strong>
              <p>{projects.items.length === 0 ? "Submit the first one with the form." : "Try another filter."}</p>
            </div>
          ) : (
            <div className="feed">
              {visible.map((p) => (
                <article key={projectId(p)} className="project">
                  <div className="project-head">
                    <h4>{p.title}</h4>
                    <CategoryTag category={p.category} />
                  </div>
                  <p className="project-desc">{p.description}</p>
                  <div className="project-meta">
                    {p.teamName && (
                      <span>
                        <Icon name="user" size={12} /> {p.teamName}
                      </span>
                    )}
                    {p.repoUrl && (
                      <a href={p.repoUrl} target="_blank" rel="noreferrer">
                        <Icon name="git" size={12} /> repo
                      </a>
                    )}
                    {p.createdAt && (
                      <span>
                        <Icon name="clock" size={12} /> {timeAgo(p.createdAt, now)}
                      </span>
                    )}
                    <code className="project-id" title="MongoDB ObjectId">
                      _id: {String(projectId(p)).slice(-8)}
                    </code>
                    <span className="spacer" />
                    <DeleteButton project={p} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function CrudTab() {
  const { projects, isAuthed } = useWorkshop();
  const hasProjects = projects.state === "ready" && projects.items.length > 0;

  return (
    <div className="tab-panel">
      <PhaseHeader
        phase={PHASE}
        title="Core CRUD Playground"
        lead="Define a Mongoose schema, then expose it through GET and POST route handlers. The form and feed below are already wired — they light up the moment your routes respond."
        files={["models/Project.js", "app/api/projects/route.js"]}
      />

      <div className="grid grid-2 crud-grid">
        <ProjectForm />
        <ProjectFeed />
      </div>

      {!isAuthed && hasProjects && (
        <Callout tone="info" title="Delete buttons are locked" icon="lock">
          Deleting is a protected action. You&apos;ll unlock it with a JWT in{" "}
          <button type="button" className="link" onClick={() => goToTab("auth")}>
            Phase 3: Auth &amp; JWT Vault
          </button>
          .
        </Callout>
      )}

      <div className="grid grid-main">
        <div className="stack">
          <Card title="Project schema" subtitle="models/Project.js" icon="database">
            <table className="table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Rules</th>
                </tr>
              </thead>
              <tbody>
                {SCHEMA_FIELDS.map((f) => (
                  <tr key={f.name} className={f.auto ? "row-muted" : ""}>
                    <td>
                      <code>{f.name}</code>
                    </td>
                    <td>
                      <Badge tone={f.auto ? "neutral" : "info"}>{f.type}</Badge>
                    </td>
                    <td className="muted">{f.rules}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="API contract" subtitle="Routes this tab calls" icon="file">
            <EndpointRow method="GET" path="/api/projects" desc="List newest first" status="200" />
            <EndpointRow method="POST" path="/api/projects" desc="Create from JSON body" status="201 / 400" />
            <EndpointRow method="DELETE" path="/api/projects/[id]" desc="Built in Phase 3" auth status="200 / 401" />
            <div className="contract-note">
              <span>Response shapes:</span> <code>{"{ projects: [...] }"}</code> and <code>{"{ project: {...} }"}</code>.
              A bare array works too.
            </div>
          </Card>

          <Card title="Status codes you'll return" icon="hash">
            <div className="codes">
              <div><Badge tone="success">200</Badge> OK: list returned</div>
              <div><Badge tone="success">201</Badge> Created: new project saved</div>
              <div><Badge tone="warning">400</Badge> Bad request: validation failed</div>
              <div><Badge tone="warning">401</Badge> Unauthorized: missing or invalid JWT</div>
              <div><Badge tone="danger">404</Badge> Not found: wrong id</div>
              <div><Badge tone="danger">500</Badge> Server error: check your terminal</div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <LiveCodeSteps
            id="phase2"
            steps={[
              { title: "Define ProjectSchema in models/Project.js", detail: "title, description, category (enum), timestamps." },
              { title: "Export with mongoose.models.Project || mongoose.model(…)", detail: "Avoids OverwriteModelError on hot reload." },
              { title: "GET handler: connectDB() → Project.find().sort()", detail: "Return { projects }." },
              { title: "POST handler: request.json() → Project.create()", detail: "Return 201, or 400 on ValidationError." },
              { title: "Submit a project — it appears in the feed", done: hasProjects },
            ]}
          />
        </div>
      </div>

      <Collapsible title="Presenter cheat sheet: File 2" subtitle="Schema + GET/POST handlers" icon="key">
        <div className="stack">
          <CodeBlock filename="models/Project.js" code={PROJECT_MODEL} />
          <CodeBlock filename="app/api/projects/route.js" code={PROJECTS_ROUTE} />
        </div>
      </Collapsible>
    </div>
  );
}
