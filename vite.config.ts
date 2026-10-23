import { readFileSync } from 'fs'
import { sentrySvelteKit } from '@sentry/sveltekit'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import Debug from 'debug'
import { defineConfig, loadEnv } from 'vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const org = '22aae0d29adf'
const project = 'family-reunion'
const repo = 'notkimroberts/family-reunion'
const SHORT_SHA_LENGTH = 7

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    /* MODE is 'production' for every `vite build`, so a local build reported its errors as
       production. SENTRY_ENVIRONMENT is 'production' on Railway (build and runtime) and
       'development' in .env.example. */
    const sentryEnvironment = env.SENTRY_ENVIRONMENT || mode

    /* One release per commit. The package.json version changes only on `bun run release`, so
       every deploy between bumps went into one release. Railway's build has no .git, so
       `setCommits: { auto: true }` failed there, and that failure skipped finalize and the deploy
       record too. Railway names the commit in RAILWAY_GIT_COMMIT_SHA; a local build has git. */
    const commitSha = env.RAILWAY_GIT_COMMIT_SHA
    const release = commitSha
        ? `${pkg.version}+${commitSha.slice(0, SHORT_SHA_LENGTH)}`
        : pkg.version

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
                sourcemaps: {
                    /* Explicit because `build.sourcemap` is: the plugin deletes maps after upload
                       only when that is unset, and the client's maps would otherwise be public. */
                    filesToDeleteAfterUpload: ['./build/**/*.map', './.svelte-kit/**/*.map'],
                },
                release: {
                    name: release,
                    deploy: {
                        env: sentryEnvironment,
                    },
                    setCommits: commitSha
                        ? { repo, commit: commitSha, ignoreMissing: true }
                        : { auto: true },
                },
            }),
            tailwindcss(),
            sveltekit(),
        ],
        /* Server maps chain twice: build/ (adapter-node's rollup) → .svelte-kit/output/server/
           (Vite) → src/. The plugin flattens them with sorcery, which finds each next map only
           through a `//# sourceMappingURL` comment. Left unset, the plugin picks 'hidden', which
           omits the comment, so server frames in Sentry stopped at .svelte-kit/output/server/. */
        build: {
            sourcemap: true,
        },
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release),
            'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(sentryEnvironment),
        },
    }
})
