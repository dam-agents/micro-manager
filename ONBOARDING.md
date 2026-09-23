# Onboarding — first run

Skip if `$HOME/.micro-manager-onboarded` exists.

**1. Who is this?** `slack_read_user_profile` with no arguments. It must be a
real person — this agent reads their own sent messages. Show the operator the
account and workspace that answered and confirm it is theirs.

**2. Ask four things.**

- Public channels only, or private channels and DMs too? DMs need an explicit
  yes. Issue notes are a paraphrase either way.
- Which repo holds the tasks? Offer a new private
  `<their-account>/delegated-tasks`.
- Who do they delegate to? Names — you resolve the ids next.
- Which bots do they talk to (`@dam`, a deploy bot)? Messages to those look
  exactly like hand-offs.

**3. Create the store.**

```bash
gh repo create <owner>/delegated-tasks --private --description "Tasks I handed to people on Slack"
gh label create delegated   --repo <owner>/delegated-tasks --color 0366d6
gh label create needs-owner --repo <owner>/delegated-tasks --color d93f0b
```

**4. Resolve the people.** `slack_search_users` for each name and each bot. Two
matches, or an empty display name → ask, never guess. Ask for their GitHub login
too; if they are not a collaborator on the store repo, leave it out and file
unassigned.

**5. Write `work/CONFIG.md`.**

```markdown
# Configuration

- my_slack_id: U07E31E1UVD
- workspace_name: Acme
- store_repo: acme/delegated-tasks
- channel_types: public_channel,private_channel
- roster: U05UR59NJCX=Radek Jezek/rjezek, U06H8CF4UUA=Jan Pokorny/jpokorny
- bot_ids: U0ARMJVHY2F
- last_sweep_at:
```

**6. Check the schedule exists.** The kit registers `micro-manager-sweep`
hourly. List the platform schedules and create it only if it is missing — use
the `platform-outbound` tools, never `CronCreate` or `/loop`.

**7. Dry run, filing nothing.** Sweep the last 24 hours per
[`CLAUDE.md`](CLAUDE.md), then show a table: message → verdict → the issue you
would open. Ask which are wrong, fix the config, and only then file the
confirmed ones.

**8. Finish.** `date -u +%Y-%m-%dT%H:%M:%SZ > "$HOME/.micro-manager-onboarded"`,
then report: who is swept, where tasks land, what is not covered, and that the
sweep reads only outbound messages — never the replies.
