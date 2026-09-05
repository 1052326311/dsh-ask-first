import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const DSH_VERSION = '0.1.2-rc.1'
const DSH_ARGS = ['--yes', `@deepseek-ai/dsh@${DSH_VERSION}`]

function run(command, args, options) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} exited ${result.status ?? 'without a status'}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'))
  }
  return result.stdout
}

function waitForServer(child, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => {
      reject(new Error(`DSH Web did not publish a URL within ${timeoutMs}ms\n${output}`))
    }, timeoutMs)
    const receive = chunk => {
      output += chunk.toString()
      const match = output.match(/dsh web: (http:\/\/[^\s]+)/)
      if (match === null) return
      clearTimeout(timer)
      resolve(match[1])
    }
    child.stdout.on('data', receive)
    child.stderr.on('data', receive)
    child.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', code => {
      clearTimeout(timer)
      reject(new Error(`DSH Web exited ${code} before publishing a URL\n${output}`))
    })
  })
}

function signalServerTree(child, signal) {
  try {
    if (process.platform === 'win32') {
      child.kill(signal)
    } else {
      process.kill(-child.pid, signal)
    }
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error
  }
}

async function stopServer(child) {
  if (child.exitCode !== null && child.stdout.destroyed && child.stderr.destroyed) return
  const closed = new Promise(resolve => child.once('close', resolve))
  signalServerTree(child, 'SIGTERM')
  const graceful = await Promise.race([
    closed.then(() => true),
    new Promise(resolve => setTimeout(() => resolve(false), 5_000)),
  ])
  if (!graceful) {
    signalServerTree(child, 'SIGKILL')
    await closed
  }
}

async function fetchTrustedPage(url) {
  const bootstrap = await fetch(url, { redirect: 'manual' })
  if (bootstrap.status < 300 || bootstrap.status >= 400) return bootstrap
  const location = bootstrap.headers.get('location')
  const setCookie = bootstrap.headers.get('set-cookie')
  if (location === null || setCookie === null) {
    throw new Error(`DSH trust bootstrap returned HTTP ${bootstrap.status} without redirect credentials`)
  }
  return fetch(new URL(location, url), {
    headers: { cookie: setCookie.split(';', 1)[0] },
  })
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-ask-first-smoke-'))
  let server
  try {
    const packJson = run('npm', ['pack', '--json', '--pack-destination', root], { cwd: process.cwd() })
    const pack = JSON.parse(packJson)[0]
    const tarball = join(root, pack.filename)
    const home = join(root, 'home')
    const environment = { ...process.env, DSH_HOME: home, NO_COLOR: '1' }

    run('npx', [...DSH_ARGS, 'plugin', '--profile', 'web', 'add', tarball], {
      cwd: process.cwd(),
      env: environment,
    })
    const config = run('npx', [...DSH_ARGS, '--profile', 'web', '--dump-config'], {
      cwd: process.cwd(),
      env: environment,
    })
    if (!config.includes('id: 1052326311-ask-first') || !config.includes('name: dsh-ask-first')) {
      throw new Error('installed bundle is absent from the rendered Web profile')
    }

    server = spawn('npx', [...DSH_ARGS, '--profile', 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'], {
      cwd: process.cwd(),
      detached: process.platform !== 'win32',
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const url = await waitForServer(server)
    const response = await fetchTrustedPage(url)
    const body = await response.text()
    if (response.status !== 200) throw new Error(`DSH Web returned HTTP ${response.status}`)
    if (!/<title>DeepSeek Harness<\/title>/.test(body)) throw new Error('DSH Web page title is missing')

    const sha256 = createHash('sha256').update(await readFile(tarball)).digest('hex')
    console.log(JSON.stringify({
      package: `${pack.name}@${pack.version}`,
      sha256,
      dshVersion: DSH_VERSION,
      bundleVisible: true,
      httpStatus: response.status,
      pageTitle: 'DeepSeek Harness',
    }))
  } finally {
    if (server !== undefined) await stopServer(server)
    await rm(root, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
