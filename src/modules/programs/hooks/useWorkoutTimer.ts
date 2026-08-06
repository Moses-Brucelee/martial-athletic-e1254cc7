import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerSpec } from "../timer";

export interface TimerState {
  elapsed: number;
  remaining: number | null;
  running: boolean;
  /** 1-based interval index for repeating modes */
  round: number;
  /** Work/rest phase for interval-style modes */
  phase: "work" | "rest" | null;
  finished: boolean;
}

/**
 * Generic timer driven by a derived TimerSpec — the same hook powers
 * AMRAP, EMOM, Tabata, intervals, countdowns, rest and stopwatch.
 */
export function useWorkoutTimer(spec: TimerSpec | null, autoStart = false) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(autoStart);
  const startedRef = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    baseRef.current = 0;
    startedRef.current = autoStart ? Date.now() : null;
    setRunning(autoStart);
  }, [spec?.mode, spec?.totalSeconds, spec?.label, autoStart]);

  useEffect(() => {
    if (!running) return;
    if (startedRef.current == null) startedRef.current = Date.now();
    const id = window.setInterval(() => {
      const started = startedRef.current ?? Date.now();
      setElapsed(baseRef.current + Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    startedRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    baseRef.current = elapsed;
    startedRef.current = null;
    setRunning(false);
  }, [elapsed]);

  const reset = useCallback(() => {
    baseRef.current = 0;
    startedRef.current = null;
    setElapsed(0);
    setRunning(false);
  }, []);

  const total = spec?.totalSeconds ?? null;
  const finished = total != null && elapsed >= total;

  useEffect(() => {
    if (finished && running) {
      baseRef.current = total ?? 0;
      startedRef.current = null;
      setRunning(false);
    }
  }, [finished, running, total]);

  let round = 1;
  let phase: TimerState["phase"] = null;
  if (spec?.intervalSeconds) {
    round = Math.floor(elapsed / spec.intervalSeconds) + 1;
    if (spec.workSeconds != null) {
      const within = elapsed % spec.intervalSeconds;
      phase = within < spec.workSeconds ? "work" : "rest";
    }
  }

  const state: TimerState = {
    elapsed: total != null ? Math.min(elapsed, total) : elapsed,
    remaining: total != null ? Math.max(0, total - elapsed) : null,
    running,
    round: spec?.rounds ? Math.min(round, spec.rounds) : round,
    phase,
    finished,
  };

  return { ...state, start, pause, reset };
}
