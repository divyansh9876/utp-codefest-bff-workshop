"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { api, normaliseProjects, projectId } from "@/lib/api";
import { decodeJwt } from "@/lib/jwt";
import { useLocalStorage } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/constants";

const WorkshopContext = createContext(null);

export function useWorkshop() {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error("useWorkshop must be used inside <WorkshopProvider>");
  return ctx;
}

export default function WorkshopProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const notify = useCallback((message, tone = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // ---- Phase 1: database health ---------------------------------------
  const [db, setDb] = useState({
    state: "idle", // idle | checking | connected | error | notbuilt
    status: null,
    data: null,
    error: null,
    ms: null,
    at: null,
    history: [],
  });

  const pingDb = useCallback(async () => {
    setDb((d) => ({ ...d, state: "checking" }));
    const r = await api("/api/health");
    const connected =
      r.ok && (r.data?.db === "connected" || r.data?.status === "ok" || r.data?.connected === true);
    const state = r.notBuilt ? "notbuilt" : connected ? "connected" : "error";
    setDb((d) => ({
      state,
      status: r.status,
      data: r.data,
      error: connected ? null : r.error || r.data?.error || "Database not connected",
      ms: r.ms,
      at: Date.now(),
      history: [...d.history, { state, ms: r.ms }].slice(-16),
    }));
    return state;
  }, []);

  // ---- Phase 2: projects ----------------------------------------------
  const [projects, setProjects] = useState({
    state: "idle", // idle | loading | ready | notbuilt | error
    items: [],
    error: null,
  });

  const loadProjects = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setProjects((p) => ({ ...p, state: p.items.length ? p.state : "loading" }));
    const r = await api("/api/projects");
    if (r.ok) {
      setProjects({ state: "ready", items: normaliseProjects(r.data), error: null });
    } else {
      setProjects((p) => ({
        ...p,
        state: r.notBuilt ? "notbuilt" : "error",
        error: r.error,
      }));
    }
    return r;
  }, []);

  const createProject = useCallback(async (input) => {
    const r = await api("/api/projects", { method: "POST", body: input });
    if (r.ok) {
      const created = r.data?.project || r.data;
      if (created && typeof created === "object" && projectId(created)) {
        setProjects((p) => ({
          state: "ready",
          error: null,
          items: [created, ...p.items.filter((x) => projectId(x) !== projectId(created))],
        }));
      }
    }
    return r;
  }, []);

  // ---- Phase 3: auth --------------------------------------------------
  const [token, setToken] = useLocalStorage(STORAGE_KEYS.token, null);
  const [user, setUser] = useLocalStorage(STORAGE_KEYS.user, null);
  const [googleCredential, setGoogleCredential] = useState(null);
  const decoded = useMemo(() => decodeJwt(token), [token]);
  const isAuthed = Boolean(token) && !decoded?.error;

  const signIn = useCallback(
    (newToken, newUser) => {
      setToken(newToken);
      setUser(newUser || null);
    },
    [setToken, setUser],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setGoogleCredential(null);
    window.google?.accounts?.id?.disableAutoSelect();
  }, [setToken, setUser]);

  const deleteProject = useCallback(
    async (id, { withToken = true } = {}) => {
      const r = await api(`/api/projects/${id}`, {
        method: "DELETE",
        token: withToken ? token : undefined,
      });
      if (r.ok) {
        setProjects((p) => ({ ...p, items: p.items.filter((x) => projectId(x) !== id) }));
      }
      return r;
    },
    [token],
  );

  const value = useMemo(
    () => ({
      notify,
      toasts,
      dismissToast,
      db,
      pingDb,
      projects,
      loadProjects,
      createProject,
      deleteProject,
      token,
      user,
      decoded,
      isAuthed,
      signIn,
      signOut,
      googleCredential,
      setGoogleCredential,
    }),
    [
      googleCredential,
      notify,
      toasts,
      dismissToast,
      db,
      pingDb,
      projects,
      loadProjects,
      createProject,
      deleteProject,
      token,
      user,
      decoded,
      isAuthed,
      signIn,
      signOut,
    ],
  );

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
}
