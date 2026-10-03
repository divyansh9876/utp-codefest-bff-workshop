"use client";

import { useState, useSyncExternalStore } from "react";
import Icon from "./Icon";
import { JsonView, Method } from "./ui";
import { requestLog } from "@/lib/api";

function statusTone(entry) {
  if (entry.status === 0) return "danger";
  if (entry.notBuilt) return "warning";
  if (entry.ok) return "success";
  if (entry.status === 401 || entry.status === 403) return "warning";
  return "danger";
}

export default function NetworkInspector() {
  const entries = useSyncExternalStore(
    requestLog.subscribe,
    requestLog.getSnapshot,
    requestLog.getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const latest = entries[0];

  return (
    <div className={`inspector${open ? " inspector-open" : ""}`}>
      <button type="button" className="inspector-bar" onClick={() => setOpen((o) => !o)}>
        <span className="inspector-title">
          <Icon name="activity" size={15} />
          BFF Network Inspector
          <span className="inspector-count">{entries.length}</span>
        </span>
        {latest ? (
          <span className="inspector-latest">
            <Method m={latest.method} />
            <code>{latest.path}</code>
            <span className={`status-text status-${statusTone(latest)}`}>
              {latest.status || "ERR"}
            </span>
            <span className="muted">{latest.ms}ms</span>
          </span>
        ) : (
          <span className="muted inspector-latest">Every request the UI makes to your BFF shows up here</span>
        )}
        <Icon name="chevronDown" size={16} className="inspector-chevron" />
      </button>

      {open && (
        <div className="inspector-body">
          <div className="inspector-toolbar">
            <span className="muted">
              Browser → <code>/api/*</code> route handlers. Passwords are masked.
            </span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => requestLog.clear()}>
              <Icon name="trash" size={13} /> Clear
            </button>
          </div>
          {entries.length === 0 ? (
            <div className="empty empty-sm">No requests yet — click something in the tabs above.</div>
          ) : (
            <div className="log">
              {entries.map((e) => (
                <div key={e.id} className={`log-entry${selected === e.id ? " log-entry-open" : ""}`}>
                  <button
                    type="button"
                    className="log-row"
                    onClick={() => setSelected((s) => (s === e.id ? null : e.id))}
                  >
                    <span className="log-time">{new Date(e.at).toLocaleTimeString()}</span>
                    <Method m={e.method} />
                    <code className="log-path">{e.path}</code>
                    {e.authed && (
                      <span className="log-auth" title="Sent with Authorization: Bearer header">
                        <Icon name="key" size={12} /> Bearer
                      </span>
                    )}
                    <span className={`status-text status-${statusTone(e)}`}>{e.status || "ERR"}</span>
                    <span className="log-ms">{e.ms}ms</span>
                  </button>
                  {selected === e.id && (
                    <div className="log-detail">
                      <div>
                        <div className="label">Request body</div>
                        <JsonView value={e.request} empty="(no body)" />
                      </div>
                      <div>
                        <div className="label">Response</div>
                        <JsonView value={e.response} empty="(empty response)" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
