import { describe, expect, it } from 'vitest'
import { photoFilename } from './photoFilename'

describe('photoFilename', () => {
    it('names the file from the first eight characters of the id', () => {
        expect(photoFilename('0b6f2c1e-4d3a-4f7e-9c2b-1a2b3c4d5e6f')).toBe(
            'patterson-reunion-0b6f2c1e.jpg',
        )
    })
})
