import path from 'node:path'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config'

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore')

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    js.configs.recommended,
    ts.configs.recommended,
    svelte.configs.recommended,
    prettier,
    svelte.configs.prettier,
    {
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        rules: {
            // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
            // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
            'no-undef': 'off',
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                /* NO `projectService: true` HERE, deliberately — it cost 42 of the 45 seconds.

                   It builds a TypeScript program so rules can ask for type information, and it did
                   that for all 231 Svelte files at ~183ms each, against ~12ms for a .ts file.
                   Removing it took `bun run lint` from 45s to 3.4s.

                   Nothing was using it. Of the 61 rules this config enables, ZERO declare
                   `requiresTypeChecking` — `ts.configs.recommended` is the syntactic set, not
                   `recommendedTypeChecked`. Verified rather than assumed: the whole repo reports
                   byte-identical findings with and without it, and an injected violation is caught
                   the same way either way.

                   Type errors are not lost; `bun run check` runs svelte-check over the same files
                   and is the thing that actually type-checks the project.

                   PUT IT BACK if you ever enable a type-aware rule — anything from
                   `ts.configs.recommendedTypeChecked`, or a svelte rule whose docs say it needs
                   type information. Without it those rules go quiet rather than erroring, which is
                   the failure mode worth knowing about. */
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
                svelteConfig,
            },
        },
    },
    {
        rules: {
            'no-control-regex': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-useless-assignment': 'off',

            '@typescript-eslint/no-unused-vars': [
                'off', // migrate eventually to warn or error.
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'svelte/no-navigation-without-resolve': 'off',
            'svelte/require-each-key': 'off',
            'svelte/no-unused-props': 'off',
            'svelte/no-at-html-tags': 'off',
        },
    },
)
