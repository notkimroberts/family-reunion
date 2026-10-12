/* Fails when added lines use British spelling. The family and the site's users are American, and
   the codebase's older text is British in places, which is exactly what new text keeps copying.

   Usage:
     bun scripts/checkAmericanSpelling.ts --staged          (pre-commit: the staged diff)
     bun scripts/checkAmericanSpelling.ts --base origin/main (CI: everything the branch adds)

   Only ADDED lines are checked, so existing text never blocks a commit. To let one line through,
   put `spelling-ignore` on it. The word list is scripts/spelling/britishSpellingsValue.ts. */
import { $ } from 'bun'
import { findBritishSpellings } from './spelling/findBritishSpellings'

const [, , mode, base] = process.argv

if (mode !== '--staged' && !(mode === '--base' && base)) {
    console.error('Usage: bun scripts/checkAmericanSpelling.ts --staged | --base <ref>')
    process.exit(1)
}

const diff =
    mode === '--staged'
        ? await $`git diff --cached --unified=0 --no-color`.text()
        : await $`git diff ${base}...HEAD --unified=0 --no-color`.text()

const found = findBritishSpellings(diff)

if (found.length > 0) {
    console.error('British spelling in added lines. Use the American form:\n')
    found.forEach((spelling) => {
        console.error(
            `  ${spelling.file}:${spelling.line}  ${spelling.british} → ${spelling.american}`,
        )
    })
    console.error(
        '\nIf a line must keep it (a proper noun, a library identifier), add `spelling-ignore` to it.',
    )
    process.exit(1)
}
