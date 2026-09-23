# micro-manager

An agent that catches the tasks you hand out in Slack and forget about.

Every hour it reads **your own outbound messages**, finds the ones where you
asked somebody else to do something, and files each new one as an issue in a
private GitHub repo. It dedupes against every task ever filed — closed ones
included — so nothing is filed twice and nothing finished comes back.

## How it works

1. **Confirm the identity.** The workspace is checked live every run; a
   connection's name does not prove which Slack it points at.
2. **Load the dedupe set first**, from the store, with `--state all`.
3. **Search your own messages** since the last sweep, paginated.
4. **Judge each one.** A task means someone else now owes something. Bots and
   your own to-dos are not tasks. Unsure → file it; a wrong row costs seconds to
   close, a missed hand-off is the whole problem.
5. **File what is new** — one issue, with the Slack permalink as its key, a
   `needs-owner` label when nobody picked it up, and a paraphrase of the context.

## Setup

Install the kit, connect Slack (as yourself, not a bot) and GitHub, and answer
the onboarding questions: which channels, which repo, who you delegate to, which
bots you talk to. It ends with a dry run that files nothing until you confirm
the judgements.

## Files

| file | what it is |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | the whole run procedure |
| [`ONBOARDING.md`](ONBOARDING.md) | first-run setup |
| [`kit.yaml`](kit.yaml) | the starter-kit manifest and the hourly schedule |
| `work/CONFIG.md` | your instance's config — not in this repo |

## Limits

- **It reads only your outbound messages, never the replies.** An open task
  means nothing *you* said closed it, not that the other person went quiet.
- One Slack workspace per instance.
- Task notes are paraphrased, never verbatim — but the repo still holds context
  from private conversations. Keep it private.

## License

Apache 2.0.
