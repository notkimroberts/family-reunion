import { readFileSync } from 'fs'
import { marked } from 'marked'
import { resolve } from 'path'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    try {
        const markdown = readFileSync(resolve('CHANGELOG.md'), 'utf-8')
        const html = await marked(markdown)
        return { html }
    } catch {
        return { html: '<p>No changelog available yet.</p>' }
    }
}
