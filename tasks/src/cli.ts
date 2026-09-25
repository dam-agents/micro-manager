import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ARTIFACT_API_PORT, createTaskServer } from "./server.ts";
import { DuplicateTaskError, InvalidInputError, NotFoundError, Store } from "./store.ts";

const USAGE = `usage:
  tasks add --permalink <url> --title <text> --context <text> --asked-on YYYY-MM-DD
            [--channel <#name>] [--assignee <slack id>]
  tasks list [--status open|closed|all] [--assignee <slack id> | --needs-owner]
  tasks has <permalink>
  tasks close <id>
  tasks serve         HTTP API for the dashboard artifact, on 127.0.0.1:5555

Prints JSON on stdout. Exit codes: 0 ok, 1 error, 2 permalink already filed.
Database: $TASKS_DB, or work/tasks.db in the repo root.`;

// The repo is checked out at $HOME, so this lands in $HOME/work/tasks.db.
const DEFAULT_DB = resolve(import.meta.dirname, "../../work/tasks.db");
const CONFIG_PATH = resolve(import.meta.dirname, "../../work/CONFIG.md");

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string, code = 1, extra: object = {}): never {
  process.stderr.write(`${JSON.stringify({ error: message, ...extra })}\n`);
  process.exit(code);
}

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) fail(`expected a task id, got: ${raw ?? "nothing"}`);
  return id;
}

function run(store: Store, command: string, argv: string[]): void {
  switch (command) {
    case "add": {
      const { values } = parseArgs({
        args: argv,
        options: {
          permalink: { type: "string" },
          title: { type: "string" },
          context: { type: "string" },
          "asked-on": { type: "string" },
          channel: { type: "string" },
          assignee: { type: "string" },
        },
      });
      print(
        store.add({
          permalink: values.permalink ?? "",
          title: values.title ?? "",
          context: values.context ?? "",
          asked_on: values["asked-on"] ?? "",
          channel: values.channel,
          assignee_slack: values.assignee,
        }),
      );
      return;
    }
    case "list": {
      const { values } = parseArgs({
        args: argv,
        options: {
          status: { type: "string", default: "all" },
          assignee: { type: "string" },
          "needs-owner": { type: "boolean", default: false },
        },
      });
      const status = values.status;
      if (status !== "open" && status !== "closed" && status !== "all") {
        fail(`--status must be open, closed or all: ${status}`);
      }
      print(store.list({ status, assignee_slack: values.assignee, needs_owner: values["needs-owner"] }));
      return;
    }
    case "has": {
      const { positionals } = parseArgs({ args: argv, allowPositionals: true });
      if (positionals.length !== 1) fail("has takes exactly one permalink");
      const task = store.findByPermalink(positionals[0]);
      print({ filed: Boolean(task), task: task ?? null });
      return;
    }
    case "close": {
      const { positionals } = parseArgs({ args: argv, allowPositionals: true });
      if (positionals.length !== 1) fail("close takes exactly one task id");
      print(store.close(parseId(positionals[0])));
      return;
    }
    default:
      fail(`unknown command: ${command}\n${USAGE}`);
  }
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === "help" || command === "--help") {
  process.stdout.write(`${USAGE}\n`);
  process.exit(command ? 0 : 1);
}

const dbPath = process.env.TASKS_DB || DEFAULT_DB;
mkdirSync(dirname(dbPath), { recursive: true });
const store = new Store(dbPath);

if (command === "serve") {
  // Loopback only: the platform relays the page's requests from inside the pod.
  createTaskServer(store, CONFIG_PATH).listen(ARTIFACT_API_PORT, "127.0.0.1", () => {
    print({ listening: `http://127.0.0.1:${ARTIFACT_API_PORT}`, db: dbPath });
  });
} else {
  try {
    run(store, command, rest);
  } catch (err) {
    if (err instanceof DuplicateTaskError) fail(err.message, 2, { existing: err.existing });
    if (err instanceof InvalidInputError || err instanceof NotFoundError) fail(err.message);
    if (err instanceof TypeError && "code" in err && String(err.code).startsWith("ERR_PARSE_ARGS")) {
      fail(`${err.message}\n${USAGE}`);
    }
    throw err;
  } finally {
    store.dispose();
  }
}
