# micro-manager

You hand out tasks in Slack all day. "Can you check the DNS?" "Who can set up
staging?" "Jan will send the contract by Friday." Then the conversation scrolls
away, and a week later nobody remembers who owes what. Often not even you.

micro-manager keeps that list for you. It notices when you ask someone else to
do something and turns each hand-off into a task you can track. When the work
is done, you close it.

## The problem

Delegating in chat is fast, and that is exactly why things get lost:

- Asks are buried in threads, between everything else people talk about.
- Some asks have no owner. "Can someone..." often means nobody.
- You nudge people ("any update?") and lose track of what you already asked.
- Your to-do app knows what you owe. Nothing tracks what others owe you.

## What it does

- Picks up the tasks you delegate, in the channels you choose.
- Flags asks that nobody picked up.
- Treats a follow-up as the same task, not a new one.
- Never brings back a task you already closed.
- Writes short notes in its own words, not copies of private messages.

When it is not sure whether something is a task, it adds it. Closing a wrong
one takes seconds. Missing a real hand-off is the whole problem.

## What it does not do

- It reads only what you wrote, never the replies. An open task means nothing
  you said closed it, not that the other person went quiet.
- It does not chase people for you.
- It works with one Slack workspace per setup.

## Getting started

Connect Slack as yourself and answer a few questions: which channels to watch,
who you usually delegate to, and which bots you talk to. A dry run shows you
what it would add before it adds anything.

Tasks are stored in a SQLite file on the agent's disk (`work/tasks.db`). They
never leave it. To close a task, tell the agent in chat, or click Close in the
dashboard. The store needs
Node 22.18 or newer and nothing else. See [`tasks/`](tasks) for the CLI.

## Dashboard

If Interactive artifacts are enabled, the agent can publish a private page that
shows your open tasks, grouped by person, with the ones nobody picked up at the
top. You can close tasks there. The page talks to a small server the agent runs
(`tasks serve`). The server stops when the agent sleeps; the page then offers a
button that asks the agent to start it again.

## License

Apache 2.0.
