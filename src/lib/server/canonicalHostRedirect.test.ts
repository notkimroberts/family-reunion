import type { RequestEvent } from '@sveltejs/kit'
import { describe, expect, it, vi } from 'vitest'
import { canonicalHostRedirect } from './canonicalHostRedirect'

function run(url: string) {
    const resolve = vi.fn(async () => new Response('page'))
    const response = canonicalHostRedirect({
        event: { url: new URL(url) } as RequestEvent,
        resolve,
    })
    return { response, resolve }
}

describe('canonicalHostRedirect', () => {
    it.each([
        'https://www.pattersonfamilyreunion.com',
        'https://pattersonsfamilyreunion.com',
        'https://www.pattersonsfamilyreunion.com',
    ])('sends %s to the bare domain with a 301, keeping the path and query', async (origin) => {
        const { response, resolve } = run(`${origin}/register?cancelled=true`)

        expect((await response).status).toBe(301)
        expect((await response).headers.get('location')).toBe(
            'https://pattersonfamilyreunion.com/register?cancelled=true',
        )
        expect(resolve).not.toHaveBeenCalled()
    })

    it('lands plain http on https', async () => {
        const { response } = run('http://pattersonsfamilyreunion.com/')

        expect((await response).headers.get('location')).toBe('https://pattersonfamilyreunion.com/')
    })

    it.each([
        'https://pattersonfamilyreunion.com/register',
        'http://localhost:5173/',
        'https://raqyfbrc.up.railway.app/api/health',
        'https://www.example.com/',
    ])('passes %s through', async (url) => {
        const { response, resolve } = run(url)

        expect(await (await response).text()).toBe('page')
        expect(resolve).toHaveBeenCalledOnce()
    })
})
