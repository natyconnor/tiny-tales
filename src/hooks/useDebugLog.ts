import { useCallback, useSyncExternalStore } from "react";

export type DebugLogEntry = {
  id: string;
  timestamp: number;
  type: "generate" | "models" | "image" | "other";
  label: string;
  request?: {
    url: string;
    method: string;
    body?: unknown;
  };
  response?: {
    status: number;
    body: unknown;
  };
  durationMs?: number;
  error?: string;
  meta?: Record<string, unknown>;
};

type Listener = () => void;

let entries: DebugLogEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DebugLogEntry[] {
  return entries;
}

let nextId = 1;

export function pushDebugEntry(
  entry: Omit<DebugLogEntry, "id" | "timestamp">
): string {
  const id = String(nextId++);
  entries = [{ ...entry, id, timestamp: Date.now() }, ...entries];
  emit();
  return id;
}

export function clearDebugEntries(): void {
  entries = [];
  emit();
}

export function useDebugLog() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const push = useCallback(
    (entry: Omit<DebugLogEntry, "id" | "timestamp">) => pushDebugEntry(entry),
    []
  );

  const clear = useCallback(() => clearDebugEntries(), []);

  return { entries: snapshot, push, clear } as const;
}
