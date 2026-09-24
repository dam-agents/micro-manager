import { DatabaseSync } from "node:sqlite";

export type Status = "open" | "closed";

export interface Task {
  id: number;
  permalink: string;
  title: string;
  context: string;
  channel: string | null;
  assignee_slack: string | null;
  asked_on: string;
  status: Status;
  closed_at: string | null;
  created_at: string;
}

export interface NewTask {
  permalink: string;
  title: string;
  context: string;
  channel?: string | null;
  assignee_slack?: string | null;
  asked_on: string;
}

export interface ListFilter {
  status?: Status | "all";
  assignee_slack?: string;
  needs_owner?: boolean;
}

export class DuplicateTaskError extends Error {
  existing: Task;
  constructor(existing: Task) {
    super(`permalink already filed as task ${existing.id}`);
    this.existing = existing;
  }
}

export class NotFoundError extends Error {}
export class InvalidInputError extends Error {}

// Each entry moves the schema one version up. Append only, never edit.
const MIGRATIONS = [
  `CREATE TABLE tasks (
    id             INTEGER PRIMARY KEY,
    permalink      TEXT NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    context        TEXT NOT NULL,
    channel        TEXT,
    assignee_slack TEXT,
    asked_on       TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at      TEXT,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
  CREATE INDEX tasks_assignee ON tasks (assignee_slack);`,
];

// Slack permalinks come as https://<ws>.slack.com/archives/<C>/p<ts>, often
// with ?thread_ts=…&cid=… appended. The key is host + path, nothing else.
export function normalizePermalink(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new InvalidInputError(`not a URL: ${raw}`);
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!/^\/archives\/[A-Z0-9]+\/p\d+$/.test(path)) {
    throw new InvalidInputError(`not a Slack message permalink: ${raw}`);
  }
  return `https://${url.host.toLowerCase()}${path}`;
}

function requireText(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new InvalidInputError(`${field} is required`);
  return value.trim();
}

export class Store {
  #db: DatabaseSync;

  constructor(path: string) {
    this.#db = new DatabaseSync(path);
    this.#db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    this.#migrate();
  }

  #migrate(): void {
    const { user_version } = this.#db.prepare("PRAGMA user_version").get() as { user_version: number };
    for (let v = user_version; v < MIGRATIONS.length; v++) {
      this.#db.exec("BEGIN");
      try {
        this.#db.exec(MIGRATIONS[v]);
        this.#db.exec(`PRAGMA user_version = ${v + 1}`);
        this.#db.exec("COMMIT");
      } catch (err) {
        this.#db.exec("ROLLBACK");
        throw err;
      }
    }
  }

  add(input: NewTask): Task {
    const permalink = normalizePermalink(input.permalink);
    const askedOn = requireText(input.asked_on, "asked_on");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(askedOn)) {
      throw new InvalidInputError(`asked_on must be YYYY-MM-DD: ${askedOn}`);
    }
    const existing = this.findByPermalink(permalink);
    if (existing) throw new DuplicateTaskError(existing);

    return this.#db
      .prepare(
        `INSERT INTO tasks (permalink, title, context, channel, assignee_slack, asked_on)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .get(
        permalink,
        requireText(input.title, "title"),
        requireText(input.context, "context"),
        input.channel?.trim() || null,
        input.assignee_slack?.trim() || null,
        askedOn,
      ) as unknown as Task;
  }

  get(id: number): Task {
    const task = this.#db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    if (!task) throw new NotFoundError(`no task with id ${id}`);
    return task;
  }

  findByPermalink(raw: string): Task | undefined {
    return this.#db
      .prepare("SELECT * FROM tasks WHERE permalink = ?")
      .get(normalizePermalink(raw)) as Task | undefined;
  }

  list(filter: ListFilter = {}): Task[] {
    const where: string[] = [];
    const params: string[] = [];
    if (filter.status && filter.status !== "all") {
      where.push("status = ?");
      params.push(filter.status);
    }
    if (filter.needs_owner) {
      where.push("assignee_slack IS NULL");
    } else if (filter.assignee_slack) {
      where.push("assignee_slack = ?");
      params.push(filter.assignee_slack);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return this.#db
      .prepare(`SELECT * FROM tasks ${clause} ORDER BY id`)
      .all(...params) as unknown as Task[];
  }

  // No reopen, on purpose: a closed task stays closed.
  close(id: number): Task {
    const task = this.get(id);
    if (task.status === "closed") return task;
    return this.#db
      .prepare(
        `UPDATE tasks SET status = 'closed', closed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE id = ? RETURNING *`,
      )
      .get(id) as unknown as Task;
  }

  dispose(): void {
    this.#db.close();
  }
}
