import { describe, expect, it } from 'vitest'
import { toCsv, type CsvColumn } from './toCsv'

type Row = { name: string; count?: number | null }

const COLUMNS: CsvColumn<Row>[] = [
    { header: 'Name', value: (row) => row.name },
    { header: 'Count', value: (row) => row.count },
]

const body = (csv: string) => csv.replace(/^\uFEFF/, '')

describe('toCsv', () => {
    it('starts with a BOM and ends every line with CRLF', () => {
        const csv = toCsv(COLUMNS, [{ name: 'Roxie', count: 2 }])
        expect(csv.startsWith('\uFEFF')).toBe(true)
        expect(body(csv)).toBe('Name,Count\r\nRoxie,2\r\n')
    })

    it('quotes commas, quotes and newlines', () => {
        const csv = toCsv(COLUMNS, [{ name: 'Patterson, "Will"\nSr' }])
        expect(body(csv)).toBe('Name,Count\r\n"Patterson, ""Will""\nSr",\r\n')
    })

    it('leaves a missing value empty', () => {
        expect(body(toCsv(COLUMNS, [{ name: 'A', count: null }]))).toBe('Name,Count\r\nA,\r\n')
    })

    it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx'])('defuses a formula: %j', (name) => {
        const [, line] = body(toCsv(COLUMNS, [{ name }])).split('\r\n')
        expect(line).toBe(`'${name},`)
    })

    it('does not defuse a negative number', () => {
        expect(body(toCsv(COLUMNS, [{ name: 'A', count: -5 }]))).toBe('Name,Count\r\nA,-5\r\n')
    })
})
