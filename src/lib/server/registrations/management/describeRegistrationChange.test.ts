import { describe, expect, it } from 'vitest'
import { describeRegistrationChange } from './describeRegistrationChange'

describe('describeRegistrationChange', () => {
    it('joins an edited value onto one line', () => {
        expect(
            describeRegistrationChange({ summary: 'Bo — T-shirt', before: 'M', after: 'L' }),
        ).toBe('Bo — T-shirt: M → L')
    })

    it('leaves a change with no earlier value as its summary', () => {
        expect(describeRegistrationChange({ summary: 'Jada was added to your party' })).toBe(
            'Jada was added to your party',
        )
    })
})
