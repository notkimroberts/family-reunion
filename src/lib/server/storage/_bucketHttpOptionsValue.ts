/* Connection settings for the bucket client — the SDK's shorthand for its node request handler.

   Without them the pool can wedge for good. On 2026-09-28 a burst of ~1,000 thumbnail requests
   filled all 50 sockets and none ever came free: the SDK logged "socket usage at capacity=50 and N
   additional requests are enqueued" with N climbing to 3,751 over five days, and every gallery
   image waited in that queue until the browser gave up. The client had no timeouts, so a request on
   a stalled connection could hold its socket forever.

   Each of these destroys a stuck request and returns its socket to the pool:
   - connectionTimeout — the TCP/TLS connect never completes.
   - requestTimeout — no response headers arrive. It only LOGS unless throwOnRequestTimeout is set,
     so that flag is what makes it a timeout at all.
   - socketTimeout — an idle timeout on the socket, including while the body streams. A large object
     that keeps flowing is never cut off; one that stops sending for this long is.

   maxSockets is the SDK's default, stated so the pool size the incident was about is visible here. */
export const bucketHttpOptionsValue = {
    connectionTimeout: 5_000,
    requestTimeout: 15_000,
    throwOnRequestTimeout: true,
    socketTimeout: 30_000,
    httpsAgent: { keepAlive: true, maxSockets: 50 },
}
