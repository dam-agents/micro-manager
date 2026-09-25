import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { NotFoundError, type Store, type Task } from "./store.ts";

// Fixed by the platform: the Artifact API relay only dials 127.0.0.1:5555.
export const ARTIFACT_API_PORT = 5555;

// Closed tasks older than this stay out of GET /tasks, so the response stays
// well under the relay's 1 MiB cap. The CLI still sees everything.
const CLOSED_WINDOW_DAYS = 90;

export interface Roster {
  [slackId: string]: string;
}

// Reads `- roster: U05UR59NJCX=Radek Jezek, U06H8CF4UUA=Jan Pokorny` from
// CONFIG.md. Read on every request so roster edits show up without a restart.
export function readRoster(configPath: string): Roster {
  let text: string;
  try {
    text = readFileSync(configPath, "utf8");
  } catch {
    return {};
  }
  const line = text.match(/^-\s*roster:\s*(.*)$/m)?.[1] ?? "";
  const roster: Roster = {};
  for (const entry of line.split(",")) {
    const [id, ...name] = entry.split("=");
    if (id?.trim() && name.length) roster[id.trim()] = name.join("=").trim();
  }
  return roster;
}

function send(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

function visibleTasks(store: Store): Task[] {
  const cutoff = new Date(Date.now() - CLOSED_WINDOW_DAYS * 86_400_000).toISOString();
  return store.list().filter((t) => t.status === "open" || (t.closed_at ?? "") >= cutoff);
}

function handle(store: Store, configPath: string, req: IncomingMessage, res: ServerResponse): void {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && pathname === "/health") {
    return send(res, 200, { ok: true });
  }
  if (req.method === "GET" && pathname === "/tasks") {
    return send(res, 200, {
      tasks: visibleTasks(store),
      roster: readRoster(configPath),
      closed_window_days: CLOSED_WINDOW_DAYS,
    });
  }
  const close = pathname.match(/^\/tasks\/(\d+)\/close$/);
  if (req.method === "POST" && close) {
    return send(res, 200, store.close(Number(close[1])));
  }
  send(res, 404, { error: `no route for ${req.method} ${pathname}` });
}

// Only reads and closes. Adding or reassigning tasks stays with the agent, so
// the dedupe rules in CLAUDE.md are never bypassed from the page.
export function createTaskServer(store: Store, configPath: string): Server {
  return createServer((req, res) => {
    // Drain the body; no route reads one.
    req.resume();
    req.on("end", () => {
      try {
        handle(store, configPath, req, res);
      } catch (err) {
        if (err instanceof NotFoundError) return send(res, 404, { error: err.message });
        send(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    });
  });
}
