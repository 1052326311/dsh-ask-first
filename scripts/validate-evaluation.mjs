import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const COMPLETED_METRICS = {
  questionCount: 'count',
  millisecondsToFirstQuestion: 'nullable-duration',
  millisecondsToBriefApproval: 'nullable-duration',
  substantiveWriteBeforeApproval: 'boolean',
  postStartDirectionCorrections: 'count',
  discoverableFactsAskedOfUser: 'count',
  independentAuthorizationOverreach: 'boolean',
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message)
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0
}

function validateIdentity(value, path, requiredKeys) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${path} must be an object`)
  for (const key of requiredKeys) {
    const item = value[key]
    assert(typeof item === 'string' && item.trim().length > 0, `${path}.${key} must be a non-empty string`)
  }
}

function validateCompleted(run, protocol) {
  assert(run.metrics !== null && typeof run.metrics === 'object', `${run.id}.metrics must be an object`)
  for (const [name, type] of Object.entries(COMPLETED_METRICS)) {
    const value = run.metrics[name]
    if (type === 'count') assert(isCount(value), `${run.id}.metrics.${name} must be a non-negative integer`)
    if (type === 'boolean') assert(typeof value === 'boolean', `${run.id}.metrics.${name} must be boolean`)
    if (type === 'nullable-duration') {
      assert(value === null || isCount(value), `${run.id}.metrics.${name} must be null or a non-negative integer`)
    }
  }
  assert(run.criteria !== null && typeof run.criteria === 'object', `${run.id}.criteria must be an object`)
  for (const criterion of protocol.criteria) {
    assert(typeof run.criteria[criterion] === 'boolean', `${run.id}.criteria.${criterion} must be boolean`)
  }
}

export function validateEvaluation(result, protocol) {
  assert(result !== null && typeof result === 'object' && !Array.isArray(result), 'result must be an object')
  assert(result.schemaVersion === 1, 'result.schemaVersion must be 1')
  assert(result.protocol === protocol.protocol, `result.protocol must be ${protocol.protocol}`)
  assert(['mechanism-smoke', 'comparative-outcome'].includes(result.claimLevel), 'result.claimLevel is invalid')
  validateIdentity(result.dsh, 'result.dsh', ['version', 'commit'])
  validateIdentity(result.model, 'result.model', ['provider', 'name'])
  validateIdentity(result.plugin, 'result.plugin', ['version', 'commit'])
  assert(Array.isArray(result.runs) && result.runs.length > 0, 'result.runs must not be empty')

  const knownScenarios = new Set(protocol.scenarios.map(item => item.id))
  const knownArms = new Set(protocol.arms)
  const keys = new Set()
  const coverage = new Map(protocol.arms.map(arm => [arm, new Map()]))

  for (const run of result.runs) {
    assert(run !== null && typeof run === 'object' && !Array.isArray(run), 'every run must be an object')
    assert(typeof run.id === 'string' && run.id.trim().length > 0, 'every run.id must be a non-empty string')
    assert(knownScenarios.has(run.scenarioId), `${run.id}.scenarioId is unknown`)
    assert(knownArms.has(run.arm), `${run.id}.arm is unknown`)
    assert(Number.isInteger(run.repetition) && run.repetition >= 1, `${run.id}.repetition must be a positive integer`)
    assert(['completed', 'failed'].includes(run.status), `${run.id}.status is invalid`)
    assert(typeof run.transcript === 'string' && run.transcript.trim().length > 0, `${run.id}.transcript must be a non-empty path or URL`)
    const key = `${run.arm}:${run.scenarioId}:${run.repetition}`
    assert(!keys.has(key), `duplicate run ${key}`)
    keys.add(key)
    const scenarioCoverage = coverage.get(run.arm)
    const repetitions = scenarioCoverage.get(run.scenarioId) ?? new Set()
    repetitions.add(run.repetition)
    scenarioCoverage.set(run.scenarioId, repetitions)

    if (run.status === 'completed') validateCompleted(run, protocol)
    else assert(typeof run.failure === 'string' && run.failure.trim().length > 0, `${run.id}.failure must explain the retained failure`)
  }

  const selectedScenarios = new Set(coverage.get(protocol.arms[0]).keys())
  assert(selectedScenarios.size > 0, 'at least one scenario must be present in both arms')
  for (const arm of protocol.arms) {
    const armScenarios = coverage.get(arm)
    assert(armScenarios.size === selectedScenarios.size, `arm ${arm} has different scenario coverage`)
    for (const scenarioId of selectedScenarios) {
      const repetitions = [...(armScenarios.get(scenarioId) ?? [])].sort((a, b) => a - b)
      assert(repetitions.length > 0, `arm ${arm} is missing ${scenarioId}`)
      assert(repetitions.every((value, index) => value === index + 1), `arm ${arm} scenario ${scenarioId} repetitions must be contiguous from 1`)
    }
  }
  for (const scenarioId of selectedScenarios) {
    const expected = [...coverage.get(protocol.arms[0]).get(scenarioId)]
    for (const arm of protocol.arms.slice(1)) {
      const actual = [...coverage.get(arm).get(scenarioId)]
      assert(actual.length === expected.length && actual.every(value => expected.includes(value)), `scenario ${scenarioId} repetitions are not paired across arms`)
    }
  }

  if (result.claimLevel === 'comparative-outcome') {
    assert(selectedScenarios.size === knownScenarios.size, 'comparative-outcome must cover every protocol scenario')
    for (const scenarioId of knownScenarios) assert(selectedScenarios.has(scenarioId), `comparative-outcome is missing ${scenarioId}`)
    for (const arm of protocol.arms) {
      for (const repetitions of coverage.get(arm).values()) {
        assert(repetitions.size >= protocol.minimumRepetitionsPerArmForOutcomeClaims, `comparative-outcome requires at least ${protocol.minimumRepetitionsPerArmForOutcomeClaims} repetitions per arm`)
      }
    }
  }

  return {
    claimLevel: result.claimLevel,
    scenarios: selectedScenarios.size,
    runs: result.runs.length,
    failures: result.runs.filter(run => run.status === 'failed').length,
  }
}

async function main() {
  const resultPath = process.argv[2]
  if (resultPath === undefined) throw new TypeError('usage: npm run eval:validate -- <result.json>')
  const protocolUrl = new URL('../docs/evaluation-protocol.json', import.meta.url)
  const [result, protocol] = await Promise.all([
    readFile(resultPath, 'utf8').then(JSON.parse),
    readFile(protocolUrl, 'utf8').then(JSON.parse),
  ])
  console.log(JSON.stringify(validateEvaluation(result, protocol)))
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
