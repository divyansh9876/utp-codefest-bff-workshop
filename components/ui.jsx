"use client";

import { useState } from "react";
import Icon from "./Icon";
import { useCopy, useLocalStorage } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/constants";

export function Badge({ tone = "neutral", dot = false, pulse = false, icon, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className={`dot${pulse ? " dot-pulse" : ""}`} />}
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function Card({ title, subtitle, icon, actions, children, className = "", tone }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ""} ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <div className="card-heading">
            {icon && (
              <span className="card-icon">
                <Icon name={icon} size={18} />
              </span>
            )}
            <div>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-sub">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Method({ m }) {
  return <span className={`method method-${m.toLowerCase()}`}>{m}</span>;
}

export function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, copy] = useCopy();
  return (
    <button type="button" className={`btn btn-ghost btn-xs ${className}`} onClick={() => copy(text)}>
      <Icon name={copied ? "check" : "copy"} size={13} />
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({ code, filename, compact = false }) {
  return (
    <div className={`codeblock${compact ? " codeblock-compact" : ""}`}>
      <div className="codeblock-head">
        <span className="codeblock-file">
          <Icon name={filename ? "file" : "terminal"} size={13} />
          {filename || "terminal"}
        </span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function JsonView({ value, empty = "No response yet" }) {
  if (value === null || value === undefined || value === "") {
    return <div className="json json-empty">{empty}</div>;
  }
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre className="json">{text}</pre>;
}

export function Collapsible({ title, subtitle, icon = "file", children, defaultOpen = false }) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary>
        <span className="collapsible-title">
          <Icon name={icon} size={16} />
          <span>
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </span>
        </span>
        <Icon name="chevronDown" size={16} className="collapsible-chevron" />
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}

export function Callout({ tone = "info", title, children, icon }) {
  const fallbackIcon = { info: "info", warning: "alert", danger: "alert", success: "check" }[tone];
  return (
    <div className={`callout callout-${tone}`}>
      <Icon name={icon || fallbackIcon} size={16} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function EndpointRow({ method, path, desc, auth = false, status }) {
  return (
    <div className="endpoint">
      <Method m={method} />
      <code className="endpoint-path">{path}</code>
      <span className="endpoint-desc">{desc}</span>
      <span className="endpoint-tags">
        {auth && <Badge tone="warning" icon="lock">Bearer</Badge>}
        {status && <Badge tone="neutral">{status}</Badge>}
      </span>
    </div>
  );
}

export function PhaseHeader({ phase, title, lead, files }) {
  return (
    <div className="phase-header">
      <div className="phase-kicker">
        <span className="phase-num">Phase {phase.n}</span>
        <span className="phase-time">
          <Icon name="clock" size={13} /> {phase.minutes} min
        </span>
      </div>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
      {files?.length > 0 && (
        <div className="phase-files">
          <span className="phase-files-label">You live-code:</span>
          {files.map((f) => (
            <code key={f} className="file-chip">
              {f}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function WhyText({ children }) {
  return (
    <p className="why-text">
      <span className="why-label">
        <Icon name="lightbulb" size={12} /> Why
      </span>
      {children}
    </p>
  );
}

/** "Why are we doing this?" panel shown at the top of each phase. */
export function WhyPhase({ goal, reasons, analogy, pitfalls }) {
  return (
    <section className="why-phase">
      <div className="why-goal">
        <span className="why-goal-icon">
          <Icon name="target" size={18} />
        </span>
        <div>
          <span className="why-goal-label">Goal of this phase</span>
          <strong>{goal}</strong>
        </div>
      </div>

      <div className="why-reasons">
        {reasons.map((r) => (
          <div key={r.title} className="why-reason">
            <Icon name={r.icon || "lightbulb"} size={16} />
            <div>
              <strong>{r.title}</strong>
              <p>{r.text}</p>
            </div>
          </div>
        ))}
      </div>

      {(analogy || pitfalls?.length > 0) && (
        <div className="why-extra">
          {analogy && (
            <div className="why-analogy">
              <span className="why-extra-label">
                <Icon name="coffee" size={13} /> Think of it like…
              </span>
              <p>{analogy}</p>
            </div>
          )}
          {pitfalls?.length > 0 && (
            <div className="why-pitfalls">
              <span className="why-extra-label">
                <Icon name="alert" size={13} /> Common pitfalls
              </span>
              <ul>
                {pitfalls.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Presenter-facing checklist of live-coding steps for a phase.
 * `done` on a step marks it complete automatically (e.g. once the endpoint responds).
 */
export function LiveCodeSteps({ id, steps }) {
  const [state, setState] = useLocalStorage(STORAGE_KEYS.steps, {});
  const [showWhy, setShowWhy] = useState(true);
  const isDone = (step, i) => step.done || Boolean(state[`${id}:${i}`]);
  const completed = steps.filter(isDone).length;

  return (
    <Card
      title="Live-coding steps"
      subtitle={`${completed} of ${steps.length} done`}
      icon="terminal"
      actions={
        <>
          <label className="toggle toggle-inline">
            <input type="checkbox" checked={showWhy} onChange={(e) => setShowWhy(e.target.checked)} />
            <span>Show why</span>
          </label>
          <div className="mini-progress" aria-hidden="true">
            <span style={{ width: `${(completed / steps.length) * 100}%` }} />
          </div>
        </>
      }
    >
      <ol className="steps">
        {steps.map((step, i) => {
          const done = isDone(step, i);
          return (
            <li key={step.title} className={`step${done ? " step-done" : ""}`}>
              <button
                type="button"
                className="step-check"
                aria-pressed={done}
                aria-label={done ? "Mark as not done" : "Mark as done"}
                disabled={step.done}
                onClick={() => setState((s) => ({ ...s, [`${id}:${i}`]: !s[`${id}:${i}`] }))}
              >
                {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
              </button>
              <div className="step-body">
                <div className="step-title">
                  {step.title}
                  {step.done && <Badge tone="success">auto-detected</Badge>}
                </div>
                {step.detail && <p className="step-detail">{step.detail}</p>}
                {showWhy && step.why && <WhyText>{step.why}</WhyText>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
