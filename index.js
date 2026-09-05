import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { UserQuestionError } from '@deepseek-ai/dsh-user-questions'

export const name = 'ask-first'
export const inject = ['systemPrompt', 'tools', 'userQuestions']

export const Config = Schema.object({
  mode: Schema.union(['adaptive', 'thorough', 'on-demand'])
    .default('adaptive')
    .description('When Ask First should interview: only on material ambiguity, on every substantive request, or only when requested.'),
  maxQuestionsPerRound: Schema.number()
    .step(1)
    .min(1)
    .max(3)
    .default(3)
    .description('Maximum number of focused questions in one native question dialog.'),
  confirmBrief: Schema.boolean()
    .default(true)
    .description('Require a final requirement-brief review before substantive execution.'),
  briefMaxChars: Schema.number()
    .step(1)
    .min(1000)
    .max(30000)
    .default(12000)
    .description('Maximum requirement-brief length accepted by ask_first_confirm.'),
})

const COPY = {
  en: {
    header: 'Requirement check',
    question: 'Does this brief match what you want?',
    approve: 'Approve and proceed (Recommended)',
    approveDescription: 'Lock this brief and start the work.',
    revise: 'Revise the brief',
    reviseDescription: 'I will give corrections before work starts.',
    continueInterview: 'Ask me more',
    continueInterviewDescription: 'Continue discovery before locking the brief.',
  },
  zh: {
    header: '需求确认',
    question: '这份需求摘要是否准确表达了你想要的结果？',
    approve: '确认并开始（推荐）',
    approveDescription: '锁定当前需求摘要并开始执行。',
    revise: '修改需求摘要',
    reviseDescription: '开始执行前，我会补充或纠正内容。',
    continueInterview: '继续问我',
    continueInterviewDescription: '继续澄清，暂不锁定需求。',
  },
}

function modeGuidance(mode) {
  if (mode === 'thorough') {
    return 'For every substantive request, run discovery before implementation. Skip only trivial, fully specified, reversible actions.'
  }
  if (mode === 'on-demand') {
    return 'Run discovery only when the user explicitly asks to be interviewed, to clarify requirements, or to use Ask First.'
  }
  return 'Run discovery when an unknown could materially change scope, user experience, cost, risk, acceptance criteria, or an irreversible action. Execute directly when the request is precise, low-risk, and cheaply reversible.'
}

export function buildGuidance(config) {
  const confirmation = config.confirmBrief
    ? 'Before substantive execution, review the settled brief with ask_first_confirm. Revise or keep interviewing when requested. Approval covers only work inside the brief, never a separately controlled action such as publishing, purchasing, deleting, or messaging others.'
    : 'Summarize the settled brief in the conversation before substantive execution. Do not call ask_first_confirm.'

  return `## Ask First: align intent before execution

${modeGuidance(config.mode)}

When discovery applies:
- Inspect the workspace, current product, available tools, and authoritative sources with safe read-only actions first. Never ask for a fact you can responsibly discover.
- Ask only for user-owned intent, priorities, tradeoffs, real-world context, or permission. Prefer ask_user_question for its native dialog. If a minimal preset lacks it, ask one concise conversational question and stop.
- Ask the smallest useful batch, at most ${config.maxQuestionsPerRound} questions per round. Each question covers one decision, uses 2-3 concrete options when helpful, recommends first with a consequence, and permits a custom answer.
- Let earlier answers determine later questions. Never run a fixed questionnaire or ask implementation trivia the agent should decide.
- Keep a proportional working brief: outcome, users and context, evidence, scope and non-goals, constraints, decisions, acceptance checks, assumptions, and open questions.
- Finish discovery only when another answer cannot materially change the result. If the user delegates a decision, record the assumption instead of silently guessing.
- Runtime-owned child agents cannot ask the human. They must return unresolved decisions to the root agent, which asks on their behalf.

${confirmation}

When DSH Plan Mode is active, use the same discovery rules, fold the settled brief into the implementation plan, and use exit_plan_mode for final review instead of creating a second confirmation dialog.`
}

function normalizeLanguage(language) {
  if (language === 'en' || language === 'zh') return language
  throw new TypeError('language must be "en" or "zh"')
}

function normalizeBrief(brief, maxChars) {
  const normalized = brief.trim()
  if (normalized.length === 0) throw new TypeError('brief must not be blank')
  if (normalized.length > maxChars) {
    throw new TypeError(`brief exceeds configured limit of ${maxChars} characters`)
  }
  return normalized
}

function reviewStatus(answer, labels) {
  const feedback = answer.custom?.trim()
  if (feedback) return { status: 'revise', feedback }
  if (answer.selected.includes(labels.approve)) return { status: 'approved' }
  if (answer.selected.includes(labels.continueInterview)) return { status: 'continue_interview' }
  return { status: 'revise' }
}

export function apply(ctx, config) {
  ctx.systemPrompt.section({
    name: 'ask-first:alignment',
    order: 40,
    text: buildGuidance(config),
  })

  if (!config.confirmBrief) return

  ctx.tools.register(defineTool({
    name: 'ask_first_confirm',
    description: 'Show the settled requirement brief in the native DSH question dialog and wait for the user to approve it, revise it, or continue the interview. Use only after requirement discovery is complete.',
    parameters: {
      brief: {
        type: 'string',
        required: true,
        description: 'Concise Markdown brief covering outcome, scope, constraints, key decisions, acceptance checks, assumptions, and remaining open questions.',
      },
      language: {
        type: 'string',
        required: true,
        description: 'Dialog language: "zh" when the user is speaking Chinese, otherwise "en".',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', required: true },
          feedback: { type: 'string' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const language = normalizeLanguage(args.language)
      const labels = COPY[language]
      const brief = normalizeBrief(args.brief, config.briefMaxChars)
      const result = await ctx.userQuestions.ask({
        questions: [{
          id: 'ask-first-brief-review',
          header: labels.header,
          question: labels.question,
          detail: brief,
          options: [
            { label: labels.approve, description: labels.approveDescription },
            { label: labels.revise, description: labels.reviseDescription },
            { label: labels.continueInterview, description: labels.continueInterviewDescription },
          ],
        }],
        ...(exec.agent === undefined ? {} : { agent: exec.agent }),
        signal: exec.signal,
      }).catch(cause => {
        if (cause instanceof UserQuestionError && cause.code === 'ASK_CANCELLED') {
          throw new Error('The user dismissed the requirement review to speak instead; stop here and wait for their message.')
        }
        throw cause
      })
      const answer = result.answers.find(item => item.id === 'ask-first-brief-review')
      if (answer === undefined) throw new Error('requirement review returned no matching answer')
      return reviewStatus(answer, labels)
    },
  }))
}
