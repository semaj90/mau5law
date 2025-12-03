import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'node:child_process';

type UpgradeRouteBody = {
	route: string;
};

/**
 * POST /api/phase82/upgrade-route
 *
 * Runs the Phase 82 codemod for a specific route.
 *
 * Body: { route: "/cases" }
 *
 * Returns: { ok: boolean, route: string, duration_ms: number, stdout: string, stderr?: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json().catch(() => ({}))) as Partial<UpgradeRouteBody>;

		if (!body.route) {
			return json({ error: 'Missing "route" in body' }, { status: 400 });
		}

		const route = body.route;
		const startedAt = Date.now();

		// Run the codemod script with --route filter
		const cmd = process.platform === 'win32' ? 'node.exe' : 'node';
		const args = ['scripts/phase82-svelte-runes-codemod.mjs', '--route', route];

		console.log('[api/phase82/upgrade-route] running:', cmd, args.join(' '));

		const result = await new Promise<{
			code: number | null;
			stdout: string;
			stderr: string;
		}>((resolve) => {
			const child = spawn(cmd, args, {
				cwd: process.cwd(),
				shell: process.platform === 'win32'
			});

			let stdout = '';
			let stderr = '';

			child.stdout?.on('data', (chunk) => {
				stdout += chunk.toString('utf8');
			});

			child.stderr?.on('data', (chunk) => {
				stderr += chunk.toString('utf8');
			});

			child.on('exit', (code) => {
				resolve({ code, stdout, stderr });
			});

			// Timeout after 30 seconds
			setTimeout(() => {
				child.kill();
				resolve({ code: -1, stdout, stderr: 'Timeout after 30s' });
			}, 30000);
		});

		const ms = Date.now() - startedAt;

		if (result.code !== 0) {
			console.error('[api/phase82/upgrade-route] failed:', result.code, result.stderr);
			return json(
				{
					ok: false,
					route,
					duration_ms: ms,
					exit_code: result.code,
					stdout: result.stdout,
					stderr: result.stderr
				},
				{ status: 500 }
			);
		}

		console.log('[api/phase82/upgrade-route] success for', route);
		return json({
			ok: true,
			route,
			duration_ms: ms,
			stdout: result.stdout
		});
	} catch (err) {
		console.error('[api/phase82/upgrade-route] error:', err);
		return json({ error: 'Internal error' }, { status: 500 });
	}
};
