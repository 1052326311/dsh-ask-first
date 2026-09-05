# dsh-ask-first

**Stop your agent from confidently building the wrong thing.**

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-0.1.2--rc.1-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
[![CI](https://github.com/1052326311/dsh-ask-first/actions/workflows/ci.yml/badge.svg)](https://github.com/1052326311/dsh-ask-first/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

English | [简体中文](README.zh-CN.md)

Ask First gives DeepSeek Harness an adaptive product-discovery loop. It inspects what it can, interviews the user only about decisions evidence cannot settle, and shows a concise requirement brief for confirmation before substantive work begins.

It uses DSH's native question dialog. There is no second chat UI, external service, database, or telemetry.

## What changes

Without Ask First:

> "Build me an admin dashboard."
>
> The agent picks a user, information hierarchy, permissions, and success criteria by accident while coding.

With Ask First:

1. The agent inspects the repository and current product first.
2. It asks one small batch of decisions whose answers can change the solution.
3. Each later question uses earlier answers. There is no fixed questionnaire.
4. It presents a short brief: outcome, users, scope, constraints, acceptance checks, and explicit assumptions.
5. The user approves, revises, or continues the interview in the native DSH dialog.

Precise, low-risk requests still run directly. Fixing a named typo should not trigger a product workshop.

## Why this is a plugin

DSH `0.1.2-rc.1` already provides the important primitives:

- `ask_user_question` for native single-select, multi-select, free-text, and batched questions.
- `ctx.userQuestions` for UI-neutral human interaction.
- Plan Mode review through `exit_plan_mode`.

Those primitives do not decide when a request is underspecified, what the next highest-value question is, whether the answer can be discovered from the environment, or when the conversation is ready to become a brief. Ask First supplies that behavior and a dedicated `ask_first_confirm` review tool without replacing the native UI.

See [Native DSH capability review](docs/native-capabilities.md) for the verified boundary and sources.

## Install

From a local checkout:

```sh
dsh plugin --profile default add ./dsh-ask-first
dsh --profile default --dump-config
```

After the public repository is available, pin the commit you reviewed:

```sh
dsh plugin --profile default add github:1052326311/dsh-ask-first#<commit>
```

The package contains ready-to-run JavaScript, so Git installation does not depend on a build script.

## Use

Install it and speak normally:

```text
Make a lightweight CRM for my sales team.
```

Ask First runs automatically in `adaptive` mode. You can also steer it explicitly:

```text
Interview me before you design this. Do not assume the workflow.
```

```text
This is a tiny reversible change. Proceed without an interview.
```

When DSH Plan Mode is active, Ask First uses native questions during discovery and leaves final implementation-plan approval to `exit_plan_mode`, avoiding two approval dialogs for the same plan.

## Configuration

Later DSH patch layers replace a row's full `config`, so restate every setting when overriding the bundle row:

```yaml
- id: 1052326311-ask-first
  name: dsh-ask-first
  config:
    mode: thorough
    maxQuestionsPerRound: 1
    confirmBrief: true
    briefMaxChars: 12000
```

| Setting | Default | Meaning |
| --- | --- | --- |
| `mode` | `adaptive` | `adaptive` asks only on material ambiguity; `thorough` interviews for all substantive work; `on-demand` activates only when requested. |
| `maxQuestionsPerRound` | `3` | Maximum questions in one native dialog, from 1 to 3. |
| `confirmBrief` | `true` | Show the final brief for approval before substantive execution. `false` also removes the confirmation tool schema. |
| `briefMaxChars` | `12000` | Maximum brief size accepted by the confirmation tool, from 1,000 to 30,000 characters. |

## Design principles

- **Inspect before asking.** Repository state, product behavior, and authoritative documentation are evidence, not user homework.
- **Ask decisions, not trivia.** The user owns intent, priorities, taste, risk, and permissions. The agent owns routine implementation choices.
- **Adaptive depth.** One decisive answer can end discovery; a consequential product may need several rounds.
- **Progressive questions.** Earlier answers determine later questions.
- **Visible assumptions.** When the user asks the agent to proceed, uncertainty moves into the brief instead of disappearing.
- **Approval is scoped.** Approving a brief does not approve publishing, purchases, deletion, external messages, or other separately controlled actions.

## Compatibility and limits

- Verified against the published DSH `0.1.2-rc.1` package interfaces; the peer range also supports `0.1.2-alpha.5` and later `0.1.2` prereleases.
- Requires a DSH surface with an active `UserQuestionProvider`; the Web app provides one.
- The standard, Cordis, and PTC presets include `ask_user_question`; the minimal preset does not. With a minimal preset, discovery falls back to one concise conversational question at a time, while final brief confirmation still uses `ctx.userQuestions` when a surface answerer is available.
- Runtime-owned child agents cannot ask the human directly. They must return unresolved decisions to the root agent.
- A pending native question blocks its tool call until it is answered or the turn is cancelled.
- The adaptive interview policy is model-followed guidance, not a hard mutation guard. A future opt-in enforcement mode should be added only with reliable tool-risk classification.

## Development

```sh
npm install
npm test
npm pack --dry-run
```

The test suite enforces 100% coverage for the runtime module. Product behavior scenarios live in [the evaluation guide](docs/evaluation.md); they intentionally make no quality claim until run against named models and DSH versions.

## License

[MIT](LICENSE)
