"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

const STORAGE_EVENT = "bff-local-storage";

function subscribeStorage(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function parse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** localStorage-backed state that is hydration-safe (server snapshot is always the fallback). */
export function useLocalStorage(key, fallback) {
  const [initial] = useState(fallback);
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => window.localStorage.getItem(key),
    () => null,
  );
  const value = useMemo(() => parse(raw, initial), [raw, initial]);

  const setValue = useCallback(
    (next) => {
      const current = parse(window.localStorage.getItem(key), initial);
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved === null || resolved === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      }
      window.dispatchEvent(new Event(STORAGE_EVENT));
    },
    [key, initial],
  );

  return [value, setValue];
}

export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

export function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      } catch {
        setCopied(false);
      }
    },
    [resetMs],
  );
  return [copied, copy];
}

function subscribeHash(callback) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function useHash() {
  return useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
}

export function goToTab(id) {
  window.history.replaceState(null, "", `#${id}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function timeAgo(date, now = Date.now()) {
  if (!date) return "";
  const seconds = Math.max(0, Math.round((now - new Date(date).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
