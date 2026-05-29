import { defineConfig } from 'drizzle-kit'

const url = new URL(process.env.DATABASE_URL!)
url.searchParams.set('options', '-c client_min_messages=warning')

export default defineConfig({
    schema: './src/lib/server/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: url.toString(),
    },
})
