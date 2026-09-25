# Onboarding — first run

Skip if `$HOME/.micro-manager-onboarded` exists.

**1. Who is this?** `slack_read_user_profile` with no arguments. It must be a
real person — this agent reads their own sent messages. Show the operator the
account and workspace that answered and confirm it is theirs.

**2. Ask three things.**

- Public channels only, or private channels and DMs too? DMs need an explicit
  yes. Task notes are a paraphrase either way.
- Who do they delegate to? Names — you resolve the ids next.
- Which bots do they talk to (`@dam`, a deploy bot)? Messages to those look
  exactly like hand-offs.

**3. Check the store.** Tasks live in `work/tasks.db`, a SQLite file the
`~/tasks/tasks` CLI creates on first use. It needs Node 22.18 or newer (it runs
TypeScript directly and uses the built-in `node:sqlite`) and nothing else.

```bash
node --version
~/tasks/tasks list
```

`list` must print `[]` on a fresh install. If Node is older than 22.18 or the
command fails, stop and show the operator the error. Never create or edit
`work/tasks.db` by hand.

**4. Resolve the people.** `slack_search_users` for each name and each bot. Two
matches, or an empty display name → ask, never guess.

**5. Write `work/CONFIG.md`.**

```markdown
# Configuration

- my_slack_id: U07E31E1UVD
- workspace_name: Acme
- channel_types: public_channel,private_channel
- roster: U05UR59NJCX=Radek Jezek, U06H8CF4UUA=Jan Pokorny
- bot_ids: U0ARMJVHY2F
- last_sweep_at:
```

**6. Check the schedule exists.** The kit registers `micro-manager-sweep`
hourly. List the platform schedules and create it only if it is missing — use
the `platform-outbound` tools, never `CronCreate` or `/loop`.

**7. Dry run, filing nothing.** Sweep the last 24 hours per
[`CLAUDE.md`](CLAUDE.md), then show a table: message → verdict → the task you
would file. Ask which are wrong, fix the config, and only then file the
confirmed ones.

**8. Offer the dashboard.** Ask if they want a live task page in the chat
preview. It needs Interactive artifacts enabled. If yes, start the server and
publish the page as [`CLAUDE.md`](CLAUDE.md) → "Dashboard" describes. If no,
skip it; they can ask later.

**9. Finish.** `date -u +%Y-%m-%dT%H:%M:%SZ > "$HOME/.micro-manager-onboarded"`,
then report: who is swept, where tasks land (`work/tasks.db`), how to close
one (ask in chat, or in the dashboard), what is not covered, and that the
sweep reads only outbound messages — never the replies.
