import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '$lib/server/db/schema'

type TestDb = ReturnType<typeof drizzle<typeof schema>>

/* An organiser row, for the paths that record who acted.

   Better Auth owns this table in production; a test only needs the id and name that
   registration_audit's foreign key and actor snapshot point at. */
export async function seedUser(
    db: TestDb,
    user: { id?: string; name?: string; email?: string } = {},
) {
    const [row] = await db
        .insert(schema.user)
        .values({
            id: user.id ?? 'user-abc',
            name: user.name ?? 'Kim Roberts',
            email: user.email ?? 'kim@example.com',
            role: 'admin',
        })
        .returning({ id: schema.user.id })
    return row.id
}
