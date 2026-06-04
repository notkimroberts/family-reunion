## CLI & Tooling

- use bun apis not node apis when possible
- never use --force flags for any CLI tool — if a command requires --force, stop and fix the underlying problem instead
- run bun format on a file after all changes complete
- do not start long living bun servers with `bun run dev`. When i type that it's a mistake

## File & Module Structure

- only one export per file named after the export (camelCase except constants)
- constants should be CAPITAL_SNAKE_CASE along with their filename
- if a function is shared check library folders for existing similar functionality before writing one
- always use full known types where possible instead of creating adhoc one-use types

## Code Style

- write pure functions and use functional style programming
- use the minimal amount of code to achieve a goal
- use descriptive variable names instead of abbreviations
- use undefined instead of null for nullish values unless a type needs null
- always use opening and closing brackets for if statements, no single line ifs
- if you're transforming data, prefer functional instance and static methods like map, filter, reduce etc over for loops when applicable

## Comments

- write short descriptive comments above each function and above code blocks that need explanation
- use /* and */ for multiline comments and // for single line comments
- comment as if every word costs money but losing a technical detail or its nuance costs more. no filler words

## Svelte & UI

- write svelte 5 components
- use shadcn-svelte and tailwindcss classes for styling, and prefer tailwind classes over style properties when possible
- dont add custom styles or classes to headings (h1, h2, etc)
- unless necessary, use flexbox and gap for layout, spacing, and alignment and dont use margins. if more complex alignment is needed use grid
- do not use svelte stores (`writable`, `readable`, `derived` from `svelte/store`) — use `.svelte.ts` files with `$state` for shared reactive state instead
