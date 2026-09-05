import { describe, expect, it } from 'vitest'
import protocol from '../docs/evaluation-protocol.json' with { type: 'json' }
import { validateEvaluation } from '../scripts/validate-evaluation.mjs'

const metrics = {
  questionCount: 1,
  millisecondsToFirstQuestion: 100,
  millisecondsToBriefApproval: 300,
  substantiveWriteBeforeApproval: false,
  postStartDirectionCorrections: 0,
  discoverableFactsAskedOfUser: 0,
  independentAuthorizationOverreach: false,
}

const criteria = Object.fromEntries(protocol.criteria.map(name => [name, true]))

function result(runs, claimLevel = 'mechanism-smoke') {
  return {
    schemaVersion: 1,
    protocol: protocol.protocol,
    claimLevel,
    dsh: { version: '0.1.2-rc.1', commit: 'a66e470' },
    model: { provider: 'deepseek-official', name: 'deepseek-v4-flash' },
    plugin: { version: '0.1.1', commit: 'candidate' },
    runs,
  }
}

function run(arm, scenarioId, repetition = 1) {
  return {
    id: `${arm}-${scenarioId}-${repetition}`,
    arm,
    scenarioId,
    repetition,
    status: 'completed',
    transcript: `transcripts/${arm}-${scenarioId}-${repetition}.jsonl`,
    metrics,
    criteria,
  }
}

describe('evaluation result validation', () => {
  it('accepts a paired mechanism smoke', () => {
    const runs = protocol.arms.map(arm => run(arm, 'underspecified-crm'))

    expect(validateEvaluation(result(runs), protocol)).toEqual({
      claimLevel: 'mechanism-smoke',
      scenarios: 1,
      runs: 2,
      failures: 0,
    })
  })

  it('retains an explained failure as a valid paired run', () => {
    const failed = {
      ...run('ask-first-adaptive', 'underspecified-crm'),
      status: 'failed',
      failure: 'provider returned HTTP 502',
    }

    expect(validateEvaluation(result([
      run('native-baseline', 'underspecified-crm'),
      failed,
    ]), protocol).failures).toBe(1)
  })

  it('rejects unpaired arms and duplicate run coordinates', () => {
    expect(() => validateEvaluation(result([
      run('native-baseline', 'underspecified-crm'),
    ]), protocol)).toThrow('different scenario coverage')

    const duplicate = run('native-baseline', 'underspecified-crm')
    expect(() => validateEvaluation(result([
      duplicate,
      { ...duplicate, id: 'another-id' },
      run('ask-first-adaptive', 'underspecified-crm'),
    ]), protocol)).toThrow('duplicate run')
  })

  it('rejects outcome claims below the full repeated protocol', () => {
    const runs = protocol.arms.map(arm => run(arm, 'underspecified-crm'))

    expect(() => validateEvaluation(result(runs, 'comparative-outcome'), protocol))
      .toThrow('must cover every protocol scenario')
  })

  it('requires exact runtime identities', () => {
    const runs = protocol.arms.map(arm => run(arm, 'underspecified-crm'))
    const invalid = result(runs)
    invalid.dsh = { version: '0.1.2-rc.1' }

    expect(() => validateEvaluation(invalid, protocol))
      .toThrow('result.dsh.commit must be a non-empty string')
  })
})
