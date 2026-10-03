const MAX_ENTRIES = 50;
const EMPTY = [];
const REDACTED_FIELDS = ["password", "passwordHash"];

let entries = EMPTY;
let seq = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function redact(body) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  for (const field of REDACTED_FIELDS) {
    if (field in copy) copy[field] = "••••••••";
  }
  if (typeof copy.credential === "string" && copy.credential.length > 40) {
    copy.credential = `${copy.credential.slice(0, 24)}… (${copy.credential.length} chars, Google ID token)`;
  }
  return copy;
}

function extractError(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  if (data.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (typeof first === "string") return first;
    if (first?.message) return first.message;
  }
  return null;
}

export const requestLog = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return entries;
  },
  getServerSnapshot() {
    return EMPTY;
  },
  clear() {
    entries = EMPTY;
    emit();
  },
};

// Spring Boot's default error body: { timestamp, status, error, path }
function isSpringDefaultError(data) {
  return Boolean(data && typeof data === "object" && "timestamp" in data && "path" in data && "status" in data);
}

/**
 * Thin fetch wrapper used by every tab. It never throws: callers get a
 * normalised result, and every call is recorded for the Network Inspector.
 *
 * `notBuilt`: no controller is mapped to this path (Spring's default 404) or
 * the HTTP method isn't mapped (405).
 * `offline`: the Next.js proxy couldn't reach the Spring Boot BFF at all.
 */
export async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const started = performance.now();
  const result = { ok: false, status: 0, data: null, notBuilt: false, offline: false, error: null, ms: 0 };

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const text = await res.text();

    result.status = res.status;
    result.ok = res.ok;

    if (isJson) {
      try {
        result.data = text ? JSON.parse(text) : null;
      } catch {
        result.data = text;
      }
    }

    const springDefault = isSpringDefaultError(result.data);
    result.offline = res.status >= 500 && !isJson;
    result.notBuilt =
      (res.status === 404 && (!isJson || springDefault)) || res.status === 405;

    if (!res.ok) {
      result.error = result.offline
        ? "Can't reach the Spring Boot BFF — is it running on BFF_URL?"
        : result.notBuilt
          ? res.status === 405
            ? `No ${method} mapping for this path yet`
            : "Endpoint not built yet"
          : (!springDefault && extractError(result.data)) ||
            (res.status >= 500
              ? `Server error (${res.status}) — check the Spring Boot console`
              : res.status === 403 && /cors/i.test(text)
                ? `Spring rejected this origin (${window.location.origin}): remove CorsConfig or add the origin to it`
                : `Request failed (${res.status})`);
    }
  } catch (err) {
    result.error = err?.message || "Network error";
  }

  result.ms = Math.round(performance.now() - started);

  entries = [
    {
      id: ++seq,
      at: Date.now(),
      method,
      path,
      status: result.status,
      ms: result.ms,
      ok: result.ok,
      notBuilt: result.notBuilt,
      offline: result.offline,
      authed: Boolean(token),
      request: redact(body),
      response: result.offline
        ? "(Proxy error — the Spring Boot BFF isn't reachable. Run ./mvnw spring-boot:run)"
        : result.notBuilt && result.status === 405
          ? "(405 Method Not Allowed — add the matching @GetMapping/@PostMapping/@DeleteMapping)"
          : result.notBuilt && !result.data
            ? "(404 — no controller mapped to this path yet)"
            : (result.data ?? (result.error ? { error: result.error } : null)),
    },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  emit();

  return result;
}

export function projectId(project) {
  return project?._id || project?.id;
}

export function normaliseProjects(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
