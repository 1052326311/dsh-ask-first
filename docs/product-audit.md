# Product and overlap audit

Reviewed on 2026-09-06. This is an evidence boundary, not a launch claim.

## Verdict

- **The underlying pain is real.** A DSH user reports that the agent skipped a requested analysis/confirmation step and implemented immediately. Independent plugin authors also describe repeated correction, forgotten constraints, and underspecified prompts.
- **The narrow product slot is plausible, but not proven.** Native DSH has the interaction primitives, while the reviewed alternatives focus on prompt rewriting, explicit-constraint retention, project initialization, execution-time drift, or a larger workflow. Ask First is the small pre-execution layer that adaptively interviews, produces a brief, and uses the native dialog without rewriting the user's prompt.
- **The mechanism works; the behavioral uplift is still unproven.** Tests establish prompt injection, native question dispatch, final rendered tool content, cancellation, package installation, and Web startup. They do not establish that a named model asks better questions or reduces rework. That requires the preregistered A/B scenarios in [evaluation.md](evaluation.md).
- **The policy is soft.** A model can ignore a system-prompt section. Ask First does not intercept writes, persist a contract, or replace approval and sandbox policy. It should not be sold as a hard execution gate.

## Direct pain evidence

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| [DSH Discussion #1311](https://github.com/deepseek-ai/deepseek-harness/discussions/1311) | A user reports that the agent ignored a request to analyze or propose first and started implementation; the same report describes dozens of unproductive searches. | One report does not estimate prevalence or prove that interviewing is the best remedy. |
| [Taskify Discussion #2891](https://github.com/deepseek-ai/deepseek-harness/discussions/2891) | Its author reports repeated scope expansion and forgotten constraints during long DSH tasks, then narrows the plugin around persistent focus and anchors. | This is an author report, not an independent controlled evaluation. |
| [Tacit Discussion #5061](https://github.com/deepseek-ai/deepseek-harness/discussions/5061) | Another project treats user corrections after a wrong turn as a recurring signal and explicitly recruits testers to validate learned directives. | It addresses cross-turn learning after mistakes, not pre-execution discovery. |
| Multiple catalog entries below | Several independent projects invest in clarification, specifications, or requirement alignment. | Supply is not adoption, retention, or causal outcome evidence. |

The honest demand verdict is therefore **real pain, moderate solution-demand evidence, no measured Ask First outcome yet**.

## Native and ecosystem overlap

| Capability | Primary boundary | Difference from Ask First |
| --- | --- | --- |
| Native `ask_user_question` and `ctx.userQuestions` | Question transport, answer structure, and UI presentation. | They do not define when discovery is warranted, which unknown matters next, or when enough is known. |
| Native Plan Mode | Approval of an implementation plan. | Ask First covers intent discovery before a plan and delegates final Plan Mode approval back to `exit_plan_mode`. |
| [dsh-prompt-enhancer](https://github.com/yaoshuo530/dsh-prompt-enhancer) | An explicit composer button rewrites a draft prompt and may show its own clarification card. | Ask First is automatic by policy, does not rewrite the prompt, and uses native question dialogs. |
| [dsh-plan-lattice](https://github.com/1052326311/dsh-plan-lattice) | Durable long-task contracts, work graphs, clarification, and execution gates. | Ask First is stateless and lightweight; it does not provide hard long-task enforcement. |
| [dsh-requirements-alignment](https://github.com/jiezeng2004-design/dsh-requirements-alignment) | Durable baseline and material drift decisions during execution. | Ask First owns the initial discovery/brief boundary before substantive work. |
| [Taskify](https://github.com/GearVoid/dsh-taskify) | User-triggered extraction and persistence of constraints already stated in the prompt. | Ask First elicits missing user-owned decisions and does not provide persistent anchors. |
| [DSH Project Initialization](https://github.com/Lorvaste/DSH-Project-Initialization) | A project-start preset that turns an idea into requirements, technical planning, and a maintenance baseline. | Ask First is domain-neutral and proportional across ordinary tasks, without a project bootstrap pipeline. |
| [Ouroboros DSH integration](https://github.com/Q00/ouroboros/tree/main/integrations/dsh-plugin) | A larger external interview, execution, evaluation, and evolution workflow exposed through MCP. | Ask First is a two-surface native DSH plugin with no external service. |

The closest overlap is initial clarification in prompt-enhancement and project-initialization tools. The defensible listing is not "the only requirements plugin"; it is **adaptive native pre-execution discovery with a confirmable brief**.

## Failure and trust boundaries

- A pending native question has no built-in timeout and waits until answered or cancelled.
- Only the root Agent can ask the human; child Agents must return unresolved decisions.
- A missing or incompatible answerer prevents the confirmation dialog from completing. The Web profile is the verified target.
- The brief is present in the session/tool history but is not a plugin-owned durable contract.
- Confirmation authorizes only the stated work. Publishing, purchasing, deletion, external messages, credentials, and other separately controlled actions still require their own authorization.
- Model behavior, latency, interruption rate, and rework reduction remain open until a named model/version is tested against the baseline.

## Publication standard

Release descriptions and catalog submissions may claim the verified mechanism and scope above. They must not claim fewer misunderstandings, faster delivery, higher success rate, broad model compatibility, or maintainer endorsement until attributable evidence exists.
