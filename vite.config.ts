import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

function clientLogRelayPlugin(): Plugin {
	return {
		name: 'client-log-relay',
		configureServer(server) {
			server.middlewares.use('/__client_log', (req, res) => {
				if (req.method === 'POST') {
					let body = '';
					req.on('data', (chunk) => {
						body += chunk;
					});
					req.on('end', () => {
						try {
							const payload = JSON.parse(body);
							const meta = payload.data ? ` ${JSON.stringify(payload.data)}` : '';
							console.log(`[CLIENT-LOG] [${payload.tag}] ${payload.message}${meta}`);
						} catch {
							console.log('[CLIENT-LOG]', body);
						}
						res.statusCode = 200;
						res.setHeader('Content-Type', 'text/plain');
						res.end('ok');
					});
				} else {
					res.statusCode = 405;
					res.end();
				}
			});
		}
	};
}

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		clientLogRelayPlugin(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
