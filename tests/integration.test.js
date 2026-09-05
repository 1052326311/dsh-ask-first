import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt, { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import * as AskFirst from '../index.js'

describe('DSH RC.1 integration', () => {
  it('loads through Cordis defaults and executes through the answerer waterfall', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(UserQuestions)
    const fiber = await ctx.plugin(AskFirst)
    ctx.on('user-questions/request', async request => ({
      answers: [{
        id: request.questions[0].id,
        selected: ['Approve and proceed (Recommended)'],
      }],
    }))

    const assembly = await ctx.systemPrompt.assemble()
    const result = await ctx.tools.execute({
      callId: 'ask-first-integration',
      name: 'ask_first_confirm',
      arguments: { brief: '# Brief\n\nBuild the approved outcome.', language: 'en' },
      signal: new AbortController().signal,
    })

    expect(renderPrompt(assembly)).toContain('Ask First: align intent before execution')
    expect(assembly.tools.map(tool => tool.name)).toContain('ask_first_confirm')
    expect(result).toMatchObject({
      isError: false,
      value: { status: 'approved' },
      content: [{ type: 'text', text: '{"status":"approved"}' }],
    })

    await fiber.dispose()
    const afterDispose = await ctx.systemPrompt.assemble()
    expect(renderPrompt(afterDispose)).not.toContain('Ask First: align intent before execution')
    expect(afterDispose.tools.map(tool => tool.name)).not.toContain('ask_first_confirm')
  })
})
