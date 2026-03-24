import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bug, X, Trash2, Copy, Check, ChevronDown, ChevronRight, Filter, GripVertical } from "lucide-react";
import { useDebugLog, type DebugLogEntry } from "../hooks/useDebugLog";

const TYPE_LABELS: Record<DebugLogEntry["type"], string> = {
  generate: "Generate",
  models: "Models",
  image: "Image",
  other: "Other",
};

const TYPE_COLORS: Record<DebugLogEntry["type"], string> = {
  generate: "bg-purple-100 text-purple-700",
  models: "bg-blue-100 text-blue-700",
  image: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-700",
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      title={`Copy ${label ?? "to clipboard"}`}
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <CopyButton text={text} label={label} />
      </div>
      <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

function CopyFullEntryButton({ entry }: { entry: DebugLogEntry }) {
  const buildFullText = useCallback(() => {
    const sections: string[] = [
      `=== ${entry.label} ===`,
      `Type: ${entry.type}`,
      `Time: ${new Date(entry.timestamp).toISOString()}`,
    ];

    if (entry.durationMs != null) sections.push(`Duration: ${entry.durationMs}ms`);
    if (entry.error) sections.push(`Error: ${entry.error}`);

    if (entry.request) {
      sections.push(
        "\n--- REQUEST ---",
        `${entry.request.method} ${entry.request.url}`,
        entry.request.body
          ? typeof entry.request.body === "string"
            ? entry.request.body
            : JSON.stringify(entry.request.body, null, 2)
          : "(no body)"
      );
    }

    if (entry.response) {
      sections.push(
        `\n--- RESPONSE (${entry.response.status}) ---`,
        typeof entry.response.body === "string"
          ? entry.response.body
          : JSON.stringify(entry.response.body, null, 2)
      );
    }

    const debug = (entry.response?.body as Record<string, unknown>)?.debug as
      | Record<string, unknown>
      | undefined;
    if (debug?.fullPrompt) {
      sections.push("\n--- FULL LLM PROMPT ---", String(debug.fullPrompt));
    }
    if (debug?.rawResponse) {
      sections.push("\n--- RAW LLM RESPONSE ---", String(debug.rawResponse));
    }

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      sections.push("\n--- META ---", JSON.stringify(entry.meta, null, 2));
    }

    return sections.join("\n");
  }, [entry]);

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(buildFullText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [buildFullText]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy all"}
    </button>
  );
}

function EntryCard({ entry }: { entry: DebugLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const debug = (entry.response?.body as Record<string, unknown>)?.debug as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}

        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[entry.type]}`}>
          {TYPE_LABELS[entry.type]}
        </span>

        <span className="text-sm text-gray-200 font-medium truncate flex-1">{entry.label}</span>

        {entry.durationMs != null && (
          <span className="text-xs text-gray-500 tabular-nums">{entry.durationMs}ms</span>
        )}

        {entry.error && <span className="text-xs text-red-400 font-medium">ERROR</span>}

        <span className="text-xs text-gray-500 tabular-nums shrink-0">{formatTime(entry.timestamp)}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <CopyFullEntryButton entry={entry} />
              </div>

              {entry.error && (
                <div className="text-sm text-red-400 bg-red-900/30 rounded p-2">{entry.error}</div>
              )}

              {debug?.fullPrompt != null && <JsonBlock data={debug.fullPrompt} label="Full LLM Prompt" />}

              {debug?.rawResponse != null && <JsonBlock data={debug.rawResponse} label="Raw LLM Response" />}

              {entry.request && (
                <JsonBlock
                  data={{
                    url: entry.request.url,
                    method: entry.request.method,
                    body: entry.request.body,
                  }}
                  label="Request"
                />
              )}

              {entry.response && (
                <JsonBlock
                  data={{
                    status: entry.response.status,
                    body: entry.response.body,
                  }}
                  label="Response"
                />
              )}

              {entry.meta && Object.keys(entry.meta).length > 0 && (
                <JsonBlock data={entry.meta} label="Meta" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MIN_WIDTH = 320;
const MAX_WIDTH_RATIO = 0.6;
const DEFAULT_WIDTH = 420;

export default function DebugPanel() {
  const { entries, clear } = useDebugLog();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DebugLogEntry["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const onResizeStart = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev: globalThis.PointerEvent) => {
      if (!dragging.current) return;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
      setPanelWidth(newWidth);
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const filtered = entries.filter((entry) => {
    if (typeFilter !== "all" && entry.type !== typeFilter) return false;
    if (search) {
      const haystack = `${entry.label} ${entry.error ?? ""} ${JSON.stringify(entry.request?.body ?? "")} ${JSON.stringify(entry.response?.body ?? "")}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const typeCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-4 z-[9999] flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-900 text-gray-300 shadow-lg border border-gray-700 hover:bg-gray-800 hover:text-white transition-all text-xs font-mono ${open ? "right-2" : "right-4"}`}
        style={open ? { right: panelWidth + 8 } : undefined}
        title="Toggle API debug panel"
      >
        <Bug className="w-4 h-4" />
        <span>Debug</span>
        {entries.length > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">
            {entries.length}
          </span>
        )}
      </button>

      {/* Side panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 z-[9998] flex"
            style={{ width: panelWidth }}
          >
            {/* Drag handle to resize */}
            <div
              onPointerDown={onResizeStart}
              className="w-2 shrink-0 cursor-col-resize flex items-center justify-center hover:bg-purple-500/20 transition-colors group"
              title="Drag to resize"
            >
              <GripVertical className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>

            <div className="flex-1 flex flex-col bg-gray-900/95 backdrop-blur-md shadow-2xl border-l border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 shrink-0">
                <Bug className="w-4 h-4 text-purple-400 shrink-0" />
                <h2 className="text-sm font-bold text-gray-100 font-mono truncate">API Debug</h2>
                <span className="text-[10px] text-gray-500 shrink-0">{entries.length}</span>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={clear}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors border border-gray-700"
                  title="Clear all entries"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0 flex-wrap">
                <Filter className="w-3 h-3 text-gray-500 shrink-0" />
                <div className="flex gap-1 flex-wrap">
                  {(["all", "generate", "models", "image", "other"] as const).map((type) => {
                    const count = type === "all" ? entries.length : (typeCounts[type] ?? 0);
                    const active = typeFilter === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${
                          active
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                        }`}
                      >
                        {type === "all" ? "All" : TYPE_LABELS[type]} ({count})
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Entry list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
                    <Bug className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium text-center">
                      {entries.length === 0 ? "No API calls captured yet" : "No entries match filters"}
                    </p>
                    <p className="text-[10px] mt-1 text-center">
                      {entries.length === 0
                        ? "Generate a story to see calls here."
                        : "Try adjusting your search or filter."}
                    </p>
                  </div>
                ) : (
                  filtered.map((entry) => <EntryCard key={entry.id} entry={entry} />)
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
