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
  WhyPhase,
} from "../ui";
import { CATEGORIES, CATEGORY_COLORS, PHASES, SAMPLE_PROJECTS } from "@/lib/constants";
import {
  EXCEPTION_HANDLER,
  PROJECT_CONTROLLER,
  PROJECT_ENTITY,
  PROJECT_REPOSITORY,
  PROJECT_SERVICE,
} from "@/lib/snippets";
import { goToTab, timeAgo, useNow } from "@/lib/hooks";
import { projectId } from "@/lib/api";

const PHASE = PHASES[1];
const EMPTY_FORM = { title: "", description: "", category: CATEGORIES[0], teamName: "", repoUrl: "" };

const SCHEMA_FIELDS = [
  { name: "title", type: "String", rules: "@NotBlank @Size(max = 80)" },
  { name: "description", type: "String", rules: "@NotBlank @Size(max = 500)" },
  { name: "category", type: "String", rules: "@NotBlank @Pattern(one of the categories)" },
  { name: "teamName", type: "String", rules: "@Size(max = 60), optional" },
  { name: "repoUrl", type: "String", rules: "optional" },
  { name: "id", type: "String", rules: "@Id → MongoDB _id, generated", auto: true },
  { name: "createdAt", type: "Instant", rules: "set by ProjectService", auto: true },
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
        else if (r.notBuilt) notify("DELETE /api/projects/{id} isn't mapped yet", "warning");
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
    } else if (r.offline) {
      notify("Spring Boot BFF isn't running", "danger");
    } else if (r.notBuilt) {
      notify("POST /api/projects isn't mapped yet", "warning");
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
          {result.offline
            ? "Start the BFF: ./mvnw spring-boot:run in the bff folder."
            : result.notBuilt
            ? "Add a @PostMapping method to ProjectController (@RequestMapping(\"/api/projects\"))."
            : result.status === 400
              ? "Validation is working — the BFF rejected bad input before it hit the database."
              : "Check the Spring Boot console for the stack trace."}
        </Callout>
      )}
      {result?.ok && (
        <Callout tone="success" title={`${result.status} Created in ${result.ms}ms`}>
          The project was saved to MongoDB and returned with its new <code>id</code> (stored as <code>_id</code>).
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
          <strong>GET /api/projects isn&apos;t mapped yet</strong>
          <p>
            Live-code <code>Project</code>, <code>ProjectRepository</code>, <code>ProjectService</code> and{" "}
            <code>ProjectController</code>, restart Spring Boot, then hit Refresh.
          </p>
        </div>
      )}

      {projects.state === "offline" && (
        <div className="empty">
          <Icon name="server" size={28} />
          <strong>Spring Boot BFF is offline</strong>
          <p>
            Run <code>./mvnw spring-boot:run</code> in the <code>bff</code> folder, then hit Refresh.
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
        lead="Model a Project document, let Spring Data generate the repository, and expose GET and POST through a controller → service → repository stack. The form and feed below are already wired: they light up the moment your endpoints respond."
        files={[
          "project/Project.java",
          "project/ProjectRepository.java",
          "project/ProjectService.java",
          "project/ProjectController.java",
          "common/ApiExceptionHandler.java",
        ]}
      />

      <WhyPhase
        goal="Model your data once and expose it through a small, predictable REST contract the UI can rely on."
        reasons={[
          {
            icon: "layers",
            title: "Why Controller → Service → Repository?",
            text: "Each layer has one job. The controller speaks HTTP, the service holds business rules (like setting createdAt), and the repository talks to MongoDB. You can change one without breaking the others, and test each in isolation.",
          },
          {
            icon: "database",
            title: "Why Spring Data repositories?",
            text: "You declare an interface and a method name like findAllByOrderByCreatedAtDesc; Spring writes the query at startup. Less code means fewer bugs during a 24-hour hackathon.",
          },
          {
            icon: "shield",
            title: "Why a request DTO with @Valid?",
            text: "The DTO is the BFF's front door: it lists exactly which fields a client may send (no sneaking in an id or createdAt), and Bean Validation rejects bad input with 400 before it ever reaches the database. Browser validation is only UX, never security.",
          },
          {
            icon: "hash",
            title: "Why consistent shapes and status codes?",
            text: "{ projects }, { project } and { error } plus 201/400/404 mean the UI can handle every case without guessing. Wrapping lists in an object also lets you add pagination later without breaking clients.",
          },
        ]}
        analogy="The DTO is the form at a government counter. If a required box is blank, the clerk hands it straight back. It never reaches the filing cabinet (MongoDB)."
        pitfalls={[
          "Forgetting @Valid: validation annotations are silently ignored",
          "Returning entities with internal fields instead of shaping the response",
          "Returning 200 for a create instead of 201",
          "No @RestControllerAdvice: errors come back as Spring's default HTML or JSON instead of { error }",
        ]}
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
          <Card title="Project document + request DTO" subtitle="Project.java · CreateProjectRequest" icon="database">
            <table className="table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Java type</th>
                  <th>Validation / source</th>
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
            <EndpointRow method="DELETE" path="/api/projects/{id}" desc="Guarded in Phase 3" auth status="200 / 401" />
            <div className="contract-note">
              <span>Response shapes:</span> <code>{"{ projects: [...] }"}</code>, <code>{"{ project: {...} }"}</code>,{" "}
              <code>{"{ error: \"...\" }"}</code>. Spring Data maps <code>@Id String id</code> to Mongo&apos;s <code>_id</code>; the
              JSON field is <code>id</code>.
            </div>
          </Card>

          <Card title="Status codes you'll return" icon="hash">
            <div className="codes">
              <div><Badge tone="success">200</Badge> OK: list returned</div>
              <div><Badge tone="success">201</Badge> Created: new project saved</div>
              <div><Badge tone="warning">400</Badge> Bad request: validation failed</div>
              <div><Badge tone="warning">401</Badge> Unauthorized: missing or invalid JWT</div>
              <div><Badge tone="danger">404</Badge> Not found: wrong id</div>
              <div><Badge tone="danger">500</Badge> Server error: check the Spring Boot console</div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <LiveCodeSteps
            id="phase2"
            steps={[
              {
                title: "Project @Document with an @Id String id",
                detail: "title, description, category, teamName, repoUrl, createdAt.",
                why: "@Document maps the class to the projects collection. A String @Id lets MongoDB generate the ObjectId, which Spring converts for you.",
              },
              {
                title: "ProjectRepository extends MongoRepository<Project, String>",
                detail: "Add findAllByOrderByCreatedAtDesc().",
                why: "You get save, findById, deleteById and more for free. The derived query means zero query code for \"newest first\".",
              },
              {
                title: "ProjectService: create() sets createdAt, delete() checks existence",
                why: "Business rules live in one place. The server, not the client, decides timestamps and ids, so nobody can backdate a submission.",
              },
              {
                title: "ProjectController: GET → { projects }, POST @Valid DTO → 201",
                detail: "CreateProjectRequest is a record with @NotBlank / @Size / @Pattern.",
                why: "The record DTO is the public contract. @Valid makes Spring reject bad input with 400 before your method runs.",
              },
              {
                title: "ApiExceptionHandler (@RestControllerAdvice) → { error }",
                why: "One place turns exceptions into the JSON shape the UI shows to users, instead of try/catch in every controller. Test it with \"Skip browser validation\".",
              },
              {
                title: "Restart, submit a project: it appears in the feed",
                done: hasProjects,
                why: "You just did a full round trip: UI → proxy → controller → service → repository → Atlas → back.",
              },
            ]}
          />
        </div>
      </div>

      <Collapsible title="Presenter cheat sheet: File 2" subtitle="Document, repository, service, controller, error handler" icon="key">
        <div className="stack">
          <CodeBlock filename="project/Project.java" code={PROJECT_ENTITY} />
          <CodeBlock filename="project/ProjectRepository.java" code={PROJECT_REPOSITORY} />
          <CodeBlock filename="project/ProjectService.java" code={PROJECT_SERVICE} />
          <CodeBlock filename="project/ProjectController.java" code={PROJECT_CONTROLLER} />
          <CodeBlock filename="common/ApiExceptionHandler.java" code={EXCEPTION_HANDLER} />
        </div>
      </Collapsible>
    </div>
  );
}
