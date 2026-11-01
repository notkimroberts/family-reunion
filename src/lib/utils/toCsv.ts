/* One CSV column: its header and how a row fills it. */
export type CsvColumn<Row> = {
    header: string
    value: (row: Row) => string | number | boolean | null | undefined
}

/* Spreadsheets run a cell starting with one of these as a formula. Names and emails are typed by the
   public, so `=HYPERLINK(...)` in a name would run on the organizer's machine. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r']

/* Byte-order mark: without it Excel reads the file as Windows-1252 and mangles every accent. */
const UTF8_BOM = '\uFEFF'

/* RFC 4180 quoting, after the formula guard so the guard's apostrophe sits inside the quotes. */
function toCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
        return ''
    }
    const text = String(value)
    const guarded =
        typeof value === 'string' && FORMULA_TRIGGERS.some((trigger) => text.startsWith(trigger))
            ? `'${text}`
            : text
    return /[",\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
}

// Renders rows as a CSV document, header first, CRLF line ends
export function toCsv<Row>(columns: CsvColumn<Row>[], rows: Row[]): string {
    const lines = [
        columns.map((column) => toCell(column.header)),
        ...rows.map((row) => columns.map((column) => toCell(column.value(row)))),
    ].map((cells) => cells.join(','))
    return `${UTF8_BOM}${lines.join('\r\n')}\r\n`
}
