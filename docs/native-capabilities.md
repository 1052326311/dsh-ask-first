# Native DSH capability review

Verified on 2026-09-05 against the published `dsh-v0.1.2-rc.1` release (`a66e4702047846cdaa10c66c9d3df3951f5ea70d`). This document separates native behavior from what Ask First adds. The relevant question, Plan Mode, Web answerer, and system-prompt source files have no behavioral diff from `dsh-v0.1.2-alpha.5`; RC.1 only changes their package versions.

## Native capability

| Surface | Native behavior | Consequence for Ask First |
| --- | --- | --- |
| `ctx.userQuestions` | A provider-neutral `ask()` service accepts one or more identified questions and dispatches them through an Agent-scoped answerer waterfall. | Call the service directly; do not depend on a particular UI. |
| Question item | Supports `header`, Markdown-capable `detail`, options with descriptions, and single- or multi-select. | The final requirement brief can be supporting detail in the same native dialog. |
| Answer item | Returns selected option labels and an optional custom answer. | Approval, revision, and free-text corrections remain structured. |
| `ask_user_question` | The model-facing Consumer exposes ids, questions, headers, options, and `multi_select`. | Use it for iterative discovery questions. It does not expose `detail` or presentation intent. |
| Web answerer | The Web bundle mounts `@deepseek-ai/dsh-client-ui-user-questions`. It takes over the composer, renders one question at a time with progress navigation, recommendation badges, choices, custom input, skip, and cancellation. `detail` uses the normal GFM Markdown renderer and long content scrolls inside a capped card. | Web users receive the built-in question interface without plugin UI code. |
| Plan Mode | `exit_plan_mode` submits Markdown through the `plan-review` presentation intent and exits only after approval. | Reuse it for final plan approval when Plan Mode is active; do not show a duplicate Ask First confirmation. |
| System prompt | Plugins can register ordered prompt sections through `ctx.systemPrompt.section()`. | Install the adaptive interview policy without changing the agent loop or deployment persona. |

## Native constraints

- A question waits indefinitely until the user answers or the owning turn is cancelled; no separate timeout policy is declared.
- A live runtime-owned child agent is rejected with `DELEGATED_CALLER`. The child must return the unresolved decision to its root agent.
- The model-facing `ask_user_question` result is compact JSON text even though the service value is structured.
- Answerers compose through the scope-filtered `user-questions/request` waterfall. An answerer returns an answer to claim the request or calls `next()` to delegate; the fallback is `NO_PROVIDER` when none accepts it.
- The standard, Cordis, and PTC presets expose `ask_user_question`. The minimal preset does not.
- The only currently declared specialized intent is `plan-review`, whose semantics require plan Markdown. Ask First therefore uses a generic question with `detail` for a requirement brief rather than mislabeling a brief as an implementation plan.
- Plan Mode is soft guidance. Sandbox and approval policies remain independent.

## What the Web question dialog does

- The conversation composer becomes the question surface while a request is pending.
- A batch is shown one question at a time with previous/next navigation.
- Single-select choices advance immediately when more questions remain; multi-select preserves several labels.
- A custom answer replaces the selection for single-select and can supplement selections for multi-select.
- Recommendation suffixes in either English or Chinese render as a localized badge while the original label remains the returned value.
- Users can skip one question, dismiss the entire batch, collapse the card, or submit when every item is answered or skipped.
- Unsubmitted drafts survive navigation between Sessions while that page scope remains mounted, but not a full reload or Session pruning.
- Only one pending request owns the composer at a time; later requests wait in the Session snapshot.
- A valid single-question `plan-review` intent switches to the dedicated `Chat about it` / `Refuse` / `Approve` card. Ask First's requirement brief intentionally remains in the generic question card.

## Gap filled by Ask First

Native DSH supplies interaction mechanics, not a product-discovery policy. Ask First adds:

1. A material-ambiguity test that lets precise, reversible work stay fast.
2. Read-only evidence gathering before user questions.
3. Progressive, high-leverage questions instead of a fixed intake form.
4. A definition of discovery readiness based on whether another answer could change the result.
5. A concise requirement brief and a native approval/revision/continue decision.
6. Explicit coordination with Plan Mode and child-agent restrictions.

## Primary sources

- [DSH `0.1.2-rc.1` release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
- [`dsh-user-questions` types](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/user-questions/src/types.ts)
- [`UserQuestionService`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/user-questions/src/index.ts)
- [`ask_user_question` Consumer](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/interaction/tool-ask-user/src/index.ts)
- [Plan Mode](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/plan/plan-mode/README.md)
- [Base bundle composition](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/bundle/base/cordis.patch.yml)
- [Web bundle question provider](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/bundle/web-app/cordis.patch.yml)
- [Web question UI behavior](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.2-rc.1/packages/client/ui-user-questions/README.md)
