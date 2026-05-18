import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
    },
    resolve: {
        alias: {
            $lib: resolve('./src/lib'),
        },
    },
})
