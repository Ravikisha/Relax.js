import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
	const out = {
		profile: 'default',
		seed: 12345,
		patchPhases: false,
		warmup: undefined,
		frames: undefined,
		budget: undefined,
		headed: false,
		verbose: false,
		timeoutMs: 10 * 60_000,
		urlPath: 'benchmarks/index.html',
	}

	for (const arg of argv.slice(2)) {
		if (arg === '--headed') out.headed = true
		else if (arg === '--verbose') out.verbose = true
		else if (arg.startsWith('--profile=')) out.profile = arg.slice('--profile='.length)
		else if (arg.startsWith('--seed=')) out.seed = Number(arg.slice('--seed='.length)) >>> 0
		else if (arg === '--patchPhases=1' || arg === '--patchPhases') out.patchPhases = true
		else if (arg.startsWith('--warmup=')) out.warmup = Number(arg.slice('--warmup='.length)) | 0
		else if (arg.startsWith('--frames=')) out.frames = Number(arg.slice('--frames='.length)) | 0
		else if (arg.startsWith('--budget=')) out.budget = Number(arg.slice('--budget='.length))
		else if (arg.startsWith('--timeoutMs=')) out.timeoutMs = Number(arg.slice('--timeoutMs='.length)) | 0
		else if (arg.startsWith('--urlPath=')) out.urlPath = arg.slice('--urlPath='.length)
	}

	return out
}

function buildUrl({ profile, seed, patchPhases, warmup, frames, budget, urlPath }, port) {
	const u = new URL(`http://127.0.0.1:${port}/${urlPath.replace(/^\/+/, '')}`)
	u.searchParams.set('profile', String(profile))
	u.searchParams.set('seed', String(seed >>> 0))
	if (patchPhases) u.searchParams.set('patchPhases', '1')
	if (warmup != null) u.searchParams.set('warmup', String(warmup | 0))
	if (frames != null) u.searchParams.set('frames', String(frames | 0))
	if (budget != null) u.searchParams.set('budget', String(budget))
	return u
}

function serveStatic(rootDir) {
	return http.createServer(async (req, res) => {
		try {
			const reqUrl = new URL(req.url ?? '/', 'http://localhost')
			let relPath = decodeURIComponent(reqUrl.pathname)
			if (relPath === '/') relPath = '/benchmarks/index.html'

			// Path traversal guard.
			const fsPath = path.resolve(rootDir, '.' + relPath)
			if (!fsPath.startsWith(rootDir)) {
				res.statusCode = 403
				res.end('Forbidden')
				return
			}

			const fs = await import('node:fs/promises')
			const data = await fs.readFile(fsPath)
			res.statusCode = 200
			// Minimal content-type mapping.
			if (fsPath.endsWith('.html')) res.setHeader('content-type', 'text/html; charset=utf-8')
			else if (fsPath.endsWith('.js')) res.setHeader('content-type', 'text/javascript; charset=utf-8')
			else if (fsPath.endsWith('.css')) res.setHeader('content-type', 'text/css; charset=utf-8')
			else if (fsPath.endsWith('.json')) res.setHeader('content-type', 'application/json; charset=utf-8')
			else res.setHeader('content-type', 'application/octet-stream')
			res.end(data)
		} catch {
			res.statusCode = 404
			res.end('Not found')
		}
	})
}

async function main() {
	const args = parseArgs(process.argv)

	// Ensure the bench bundle exists.
	// We deliberately keep this as a dynamic import-free step in case users want to build separately.
	// If dist is missing, the browser run will fail and the error will be explicit.

	const server = serveStatic(repoRoot)
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	const port = server.address().port

	const url = buildUrl(args, port)
	if (args.verbose) {
		process.stdout.write(`[bench] url: ${url.toString()}\n`)
	}

	const browser = await chromium.launch({ headless: !args.headed })
	const page = await browser.newPage()

	const consoleLines = []
	page.on('console', (msg) => {
		const text = msg.text()
		consoleLines.push(text)
		if (args.verbose) process.stdout.write(`[browser:${msg.type()}] ${text}\n`)
	})
	page.on('pageerror', (err) => {
		consoleLines.push(String(err))
		if (args.verbose) process.stdout.write(`[browser:error] ${String(err)}\n`)
	})

	try {
		await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: args.timeoutMs })
		await page.click('#run', { timeout: args.timeoutMs })

		// Wait until output looks complete: it always contains the last case name.
		await page.waitForFunction(
			() => {
				const out = document.getElementById('out')
				const t = out?.textContent ?? ''
				return t.includes('# input-typing-1k:relax-vdom')
			},
			undefined,
			{ timeout: args.timeoutMs }
		)

		const text = await page.$eval('#out', (el) => el.textContent ?? '')
		process.stdout.write(text.trimEnd() + '\n')
	} finally {
		await page.close().catch(() => {})
		await browser.close().catch(() => {})
		await new Promise((resolve) => server.close(() => resolve()))
	}
}

main().catch((err) => {
	process.stderr.write(String(err?.stack ?? err) + '\n')
	process.exitCode = 1
})
