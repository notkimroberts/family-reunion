/* Whether a string is shaped like the uuids this app uses as ids.

   Guards every route that takes an id straight from the URL into a `where id = $1`. Postgres
   rejects a malformed uuid with a query ERROR, not an empty result, so without this a visitor
   typing /photos/banana gets a 500 and Sentry gets a report — when the honest answer is 404. Cheap
   enough to run on every request and it removes a whole class of noise.

   Shape only, deliberately: whether the id EXISTS is the database's question. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
    return UUID.test(value)
}
