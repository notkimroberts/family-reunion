import { SPELLING_IGNORE_MARKER } from './SPELLING_IGNORE_MARKER'
import { britishSpellingsValue } from './britishSpellingsValue'

export type BritishSpelling = {
    file: string
    line: number
    british: string
    american: string
    text: string
}

/* Files whose added lines are generated, not written — and this folder, whose word list and tests
   are made of British spellings. */
const IGNORED_FILE_PATTERNS = [
    /^scripts\/spelling\//,
    /^bun\.lock$/,
    /^drizzle\/meta\//,
    /^CHANGELOG\.md$/,
    /\.(png|jpe?g|svg|ico)$/,
]

const lookupValue = new Map(britishSpellingsValue.map((entry) => [entry.british, entry.american]))
const wordPattern = new RegExp(
    `(${britishSpellingsValue
        .map((entry) => entry.british)
        .sort((a, b) => b.length - a.length)
        .join('|')})`,
    'gi',
)

/* A word, not part of one: no letter before it, so getPhotoNeighbours (an existing identifier) is
   left alone, and no LOWERCASE letter after it, so organiserName and CHEQUE_PAYEE still count. */
function isWholeWord(text: string, start: number, end: number): boolean {
    return !/[A-Za-z]/.test(text[start - 1] ?? '') && !/[a-z]/.test(text[end] ?? '')
}

function findInLine(text: string): { british: string; american: string }[] {
    if (text.includes(SPELLING_IGNORE_MARKER)) {
        return []
    }
    return [...text.matchAll(wordPattern)]
        .filter((match) => isWholeWord(text, match.index, match.index + match[0].length))
        .map((match) => ({
            british: match[0],
            american: lookupValue.get(match[0].toLowerCase()) ?? '',
        }))
}

/* British spellings on the ADDED lines of a unified diff (`git diff -U0`). Only added lines, so text
   that was already in the repository never fails a commit — but a line that is edited counts as
   added, so a British word on a line you touch is yours to fix. */
export function findBritishSpellings(diff: string): BritishSpelling[] {
    const state = { file: '', line: 0 }
    return diff.split('\n').flatMap((raw) => {
        const fileHeader = raw.match(/^\+\+\+ (?:b\/)?(.*)$/)
        if (fileHeader) {
            state.file = fileHeader[1]
            return []
        }
        const hunkHeader = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
        if (hunkHeader) {
            state.line = Number(hunkHeader[1])
            return []
        }
        if (
            !raw.startsWith('+') ||
            IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(state.file))
        ) {
            return []
        }
        const line = state.line
        state.line += 1
        const text = raw.slice(1)
        return findInLine(text).map((found) => ({
            file: state.file,
            line,
            text: text.trim(),
            ...found,
        }))
    })
}
