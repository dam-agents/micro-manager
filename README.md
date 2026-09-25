# micro-manager

Never lose track of what you asked someone to do in Slack.

"Can you check the DNS?" "Who can set up staging?" You ask, the chat scrolls
away, and a week later nobody remembers. Often not even you.

micro-manager reads the messages you send on Slack throughout the day and keeps
a list of everything you've asked someone to do. Each task stays on the list
until you mark it done.

## What it does

- Picks up the tasks you hand off, in the channels you choose.
- Flags asks that nobody picked up ("can someone...").
- Treats a follow-up ("any update?") as the same task, not a new one.
- Writes short notes in its own words, never copies of private messages.
- When unsure, adds the task. Closing a wrong one is easier than missing a real one.

## What it does not do

- It reads only what you wrote, never the replies. An open task means nothing
  you said closed it, not that the other person went quiet.
- It does not chase people for you.

## Getting started

Connect Slack as yourself and answer a few questions: which channels to watch,
who you usually delegate to, and which bots you talk to. A dry run shows what
it would add before it adds anything.

Tasks stay in a local file on the agent's disk and never leave it. Close a task
by telling the agent in chat, or in the dashboard. Needs Node 22.18 or newer.

## Dashboard

If Interactive artifacts are enabled, the agent can publish a private page with
your open tasks, grouped by person, with unowned ones at the top. You can close
tasks there too.

## License

Apache 2.0.
