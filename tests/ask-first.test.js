import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserQuestionError } from '@deepseek-ai/dsh-user-questions'
import { buildGuidance, apply } from '../index.js'

const defaultConfig = {
  mode: 'adaptive',
  maxQuestionsPerRound: 3,
  confirmBrief: true,
  briefMaxChars: 12000,
}

function setup(config = defaultConfig) {
  const state = { section: undefined, tool: undefined }
  const ctx = {
    systemPrompt: {
      section(section) {
        state.section = section
        return () => {}
      },
    },
    tools: {
      register(tool) {
        state.tool = tool
        return () => {}
      },
    },
    userQuestions: { ask: vi.fn() },
  }
  apply(ctx, config)
  return { ctx, state }
}

async function execute(tool, arguments_) {
  return tool.execute(arguments_, {
    signal: new AbortController().signal,
  })
}

describe('Ask First guidance', () => {
  it('registers adaptive guidance and the confirmation tool', () => {
    const { state } = setup()

    expect(state.section).toMatchObject({ name: 'ask-first:alignment', order: 40 })
    expect(state.section.text).toContain('materially change scope')
    expect(state.section.text).toContain('at most 3 questions per round')
    expect(state.tool.name).toBe('ask_first_confirm')
    expect(state.tool.output.render({}, { status: 'approved' }))
      .toEqual([{ type: 'text', text: '{"status":"approved"}' }])
  })

  it.each([
    ['thorough', 'For every substantive request'],
    ['on-demand', 'only when the user explicitly asks'],
  ])('renders %s mode guidance', (mode, expected) => {
    expect(buildGuidance({ ...defaultConfig, mode })).toContain(expected)
  })

  it('supports conversation-only confirmation', () => {
    const guidance = buildGuidance({ ...defaultConfig, confirmBrief: false })
    const { state } = setup({ ...defaultConfig, confirmBrief: false })
    expect(guidance).toContain('Do not call ask_first_confirm')
    expect(guidance).not.toContain('Before substantive execution, present the settled brief')
    expect(state.tool).toBeUndefined()
  })
})

describe('ask_first_confirm', () => {
  let ctx
  let tool

  beforeEach(() => {
    const setupResult = setup()
    ctx = setupResult.ctx
    tool = setupResult.state.tool
  })

  it('uses the native dialog and maps English approval', async () => {
    ctx.userQuestions.ask.mockResolvedValue({
      answers: [{ id: 'ask-first-brief-review', selected: ['Approve and proceed (Recommended)'] }],
    })

    const result = await execute(tool, { brief: '  # Brief\n\nShip it.  ', language: 'en' })

    expect(result).toEqual({ status: 'approved' })
    expect(ctx.userQuestions.ask).toHaveBeenCalledWith(expect.objectContaining({
      questions: [expect.objectContaining({
        id: 'ask-first-brief-review',
        detail: '# Brief\n\nShip it.',
        header: 'Requirement check',
      })],
    }))
  })

  it('maps Chinese continue-interview and forwards the abort signal', async () => {
    ctx.userQuestions.ask.mockResolvedValue({
      answers: [{ id: 'ask-first-brief-review', selected: ['继续问我'] }],
    })
    const controller = new AbortController()

    const result = await tool.execute({ brief: '# 需求', language: 'zh' }, { signal: controller.signal })

    expect(result).toEqual({ status: 'continue_interview' })
    expect(ctx.userQuestions.ask).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }))
  })

  it('returns custom feedback as a revision', async () => {
    ctx.userQuestions.ask.mockResolvedValue({
      answers: [{ id: 'ask-first-brief-review', selected: [], custom: '  Add CSV export.  ' }],
    })

    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .resolves.toEqual({ status: 'revise', feedback: 'Add CSV export.' })
  })

  it('treats revise and skipped answers as revisions', async () => {
    ctx.userQuestions.ask
      .mockResolvedValueOnce({
        answers: [{ id: 'ask-first-brief-review', selected: ['Revise the brief'] }],
      })
      .mockResolvedValueOnce({
        answers: [{ id: 'ask-first-brief-review', selected: [] }],
      })

    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .resolves.toEqual({ status: 'revise' })
    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .resolves.toEqual({ status: 'revise' })
  })

  it('passes an agent through when present', async () => {
    const agent = { id: 'root' }
    ctx.userQuestions.ask.mockResolvedValue({
      answers: [{ id: 'ask-first-brief-review', selected: ['Approve and proceed (Recommended)'] }],
    })

    await tool.execute({ brief: '# Brief', language: 'en' }, {
      agent,
      signal: new AbortController().signal,
    })

    expect(ctx.userQuestions.ask).toHaveBeenCalledWith(expect.objectContaining({ agent }))
  })

  it.each([
    [{ brief: '   ', language: 'en' }, 'brief must not be blank'],
    [{ brief: '# Brief', language: 'fr' }, 'language must be "en" or "zh"'],
    [{ brief: 'x'.repeat(12001), language: 'en' }, 'brief exceeds configured limit'],
  ])('rejects invalid review arguments', async (arguments_, message) => {
    await expect(execute(tool, arguments_)).rejects.toThrow(message)
  })

  it('rejects a response without its stable answer id', async () => {
    ctx.userQuestions.ask.mockResolvedValue({ answers: [] })

    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .rejects.toThrow('requirement review returned no matching answer')
  })

  it('turns dialog dismissal into an instruction to wait for the user', async () => {
    ctx.userQuestions.ask.mockRejectedValue(
      new UserQuestionError('question cancelled', 'ASK_CANCELLED'),
    )

    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .rejects.toThrow('stop here and wait for their message')
  })

  it('preserves other interaction failures', async () => {
    const failure = new UserQuestionError('no answerer', 'NO_PROVIDER')
    ctx.userQuestions.ask.mockRejectedValue(failure)

    await expect(execute(tool, { brief: '# Brief', language: 'en' }))
      .rejects.toBe(failure)
  })
})
