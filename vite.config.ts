import { readFileSync } from 'fs'
import { sentrySvelteKit } from '@sentry/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import Debug from 'debug'
import { defineConfig, loadEnv } from 'vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const org = '22aae0d29adf'
const project = 'family-reunion'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    // Forward DEBUG into process.env so the `debug` package can read it.
    // Also call Debug.enable() directly — Vite loads the debug package before
    // vite.config.ts runs, so the package initializes with no enabled namespaces.
    // Debug.enable() updates them retroactively since enabled is checked dynamically.
    if (env.DEBUG) {
        Debug.enable(env.DEBUG)
    }

    return {
        plugins: [
            sentrySvelteKit({
                org,
                project,
                // vite.config.ts runs before Vite loads .env into process.env, so loadEnv is needed to read it
                authToken: env.SENTRY_AUTH_TOKEN ?? process.env.SENTRY_AUTH_TOKEN,
                // adapter-node produces a 3-level source map chain:
                //   build/ → .svelte-kit/adapter-node/ → src/
                // sorcery only resolves one level, so we upload both levels and let Sentry chain them.
                sourcemaps: {
                    assets: ['./build/**', './.svelte-kit/adapter-node/**'],
                },
                release: {
                    name: pkg.version,
                    deploy: {
                        env: process.env.SENTRY_ENVIRONMENT ?? 'production',
                    },
                    setCommits: {
                        auto: true,
                    },
                },
            }),
            tailwindcss(),
            sveltekit(),
        ],
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(pkg.version),
        },
    }
})
