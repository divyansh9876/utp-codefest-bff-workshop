"use client";

import Icon from "./Icon";
import { PHASES, STORAGE_KEYS, TOTAL_MINUTES } from "@/lib/constants";
import { formatDuration, goToTab, useLocalStorage, useNow } from "@/lib/hooks";

const IDLE = { running: false, startedAt: null, elapsedBefore: 0 };
const TOTAL_MS = TOTAL_MINUTES * 60 * 1000;

function currentPhase(elapsedMs) {
  let start = 0;
  for (const phase of PHASES) {
    const end = start + phase.minutes * 60 * 1000;
    if (elapsedMs < end) return { phase, remaining: end - elapsedMs };
    start = end;
  }
  return { phase: PHASES[PHASES.length - 1], remaining: 0 };
}

export default function PhaseTimer() {
  const [timer, setTimer] = useLocalStorage(STORAGE_KEYS.timer, IDLE);
  const now = useNow(1000, timer.running);
  const elapsed =
    timer.elapsedBefore + (timer.running && timer.startedAt ? Math.max(0, now - timer.startedAt) : 0);
  const { phase, remaining } = currentPhase(elapsed);
  const overtime = elapsed > TOTAL_MS;
  const warn = remaining > 0 && remaining < 3 * 60 * 1000;

  const toggle = () =>
    setTimer((t) =>
      t.running
        ? { running: false, startedAt: null, elapsedBefore: t.elapsedBefore + (Date.now() - t.startedAt) }
        : { ...t, running: true, startedAt: Date.now() },
    );

  return (
    <div className={`timer${timer.running ? " timer-running" : ""}`}>
      <div className="timer-main">
        <button type="button" className="btn btn-icon btn-sm" onClick={toggle} title={timer.running ? "Pause workshop clock" : "Start workshop clock"}>
          <Icon name={timer.running ? "pause" : "play"} size={14} />
        </button>
        <div className="timer-read">
          <span className="timer-clock">{formatDuration(elapsed)}</span>
          <span className="timer-total">/ {formatDuration(TOTAL_MS)}</span>
        </div>
        <button
          type="button"
          className="btn btn-icon btn-sm btn-ghost"
          onClick={() => setTimer(IDLE)}
          title="Reset workshop clock"
        >
          <Icon name="reset" size={14} />
        </button>
      </div>
      <div className="timer-bar" aria-hidden="true">
        {PHASES.map((p, i) => {
          const before = PHASES.slice(0, i).reduce((s, x) => s + x.minutes, 0) * 60000;
          const span = p.minutes * 60000;
          const fill = Math.min(1, Math.max(0, (elapsed - before) / span));
          return (
            <span key={p.id} style={{ flex: p.minutes }} className="timer-seg">
              <span style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
      <button type="button" className={`timer-phase${warn ? " timer-warn" : ""}`} onClick={() => goToTab(phase.id)}>
        {overtime ? (
          "Overtime — wrap up!"
        ) : (
          <>
            Phase {phase.n} · {formatDuration(remaining)} left
          </>
        )}
      </button>
    </div>
  );
}
