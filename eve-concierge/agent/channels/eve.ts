import { timingSafeEqual } from "node:crypto";
import { eveChannel } from "eve/channels/eve";
import { type AuthFn, extractBearerToken, localDev } from "eve/channels/auth";

/**
 * Route auth for Eve's HTTP session API.
 *
 * - `localDev()` admits loopback callers, so `eve dev`, the TUI, and the
 *   transport bridge running on the same host work with no configuration.
 * - `transportSecret()` admits the transport bridge over a non-loopback hop
 *   (e.g. a deployed agent) when it presents `Authorization: Bearer
 *   $ESSOS_TRANSPORT_SECRET`. It fails closed: if the secret is unset or the
 *   token does not match, the entry skips and the walk ends in a 401.
 *
 * This replaces the `eve init` `placeholderAuth()` scaffold (which 401s in
 * production) and drops `vercelOidc()` since Essos does not deploy on Vercel.
 */
function transportSecret(): AuthFn<Request> {
  return (request) => {
    const expected = process.env.ESSOS_TRANSPORT_SECRET;
    if (!expected) return null;
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) return null;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return {
      attributes: {},
      authenticator: "transport-secret",
      principalId: "essos-transport",
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [localDev(), transportSecret()],
});
