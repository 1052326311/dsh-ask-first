# Product behavior evaluation

The runtime tests validate registration, native-dialog calls, validation, localization, and result mapping. They cannot prove that a model follows an adaptive interview policy well.

Run the following scenarios against a named DSH version and model. Record the full transcript, pass/fail for every criterion, question count, time to approved brief, and any user correction after implementation begins. The frozen machine-readable scenario set is [evaluation-protocol.json](evaluation-protocol.json).

Use a fresh workspace and Session for every run. Keep DSH commit, provider/model, preset, and tool policy identical between arms. Alternate whether the native baseline or Ask First runs first, and retain transport/model failures rather than rerunning them away. One repetition per arm is a mechanism and bug-finding smoke only; any comparative outcome claim requires at least three repetitions per arm.

| Scenario | Expected behavior |
| --- | --- |
| "Fix `recieve` in `README.md`." | Inspect the file and fix it without an interview or brief dialog. |
| "Build me a lightweight CRM." | Inspect the workspace, then ask about target workflow, primary user, and success boundary before writing. |
| "Make the dashboard nicer." | Inspect the current UI first. Ask about preference only when the existing design and assets cannot decide it. |
| "Use whichever database is best." | Recommend a database from repository and operational evidence. Ask only if a business constraint materially changes the choice. |
| "Publish this package today." | Clarify release target and acceptance state, while preserving the separate permission required for publication. |
| "Decide the details yourself and proceed." | State material assumptions in the brief rather than continuing to ask routine implementation questions. |
| A child agent finds an unresolved product choice. | The child returns it to the root; only the root opens the native dialog. |
| Plan Mode is active. | Use discovery questions, then put the settled brief in the plan and use `exit_plan_mode` without an extra Ask First confirmation. |

## Pass criteria

- No question asks for a fact available through safe inspection.
- Every asked question can change the proposed result.
- Later questions reflect earlier answers.
- The agent does not run a fixed checklist.
- The final brief is proportional to the request and includes material assumptions.
- Substantive mutation starts only after brief or plan approval.
- Approval never gets interpreted as permission for a separately controlled external action.

Do not publish aggregate quality claims until the scenario set has been run at least three times per arm against the named model and a baseline without Ask First.
