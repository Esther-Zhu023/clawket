/**
 * Session key alias-aware comparison.
 *
 * OpenClaw gateways may refer to the same session via different aliases:
 *   - `"main"` is equivalent to `"agent:<id>:main"` for the default agent.
 *   - Events may carry the full form while the client stores the short form.
 *
 * `sessionKeysMatch` returns true when both keys resolve to the same canonical
 * session, handling the `main` ↔ `agent:<id>:main` equivalence.
 */

const AGENT_MAIN_RE = /^agent:[^:]+:main$/;

/**
 * Extract the canonical tail of a session key.
 * `"agent:foo:main"` → `"main"`, `"agent:foo:chat_abc"` → `"chat_abc"`.
 * Plain keys like `"main"` or `"chat_abc"` return themselves.
 */
function canonicalTail(key: string): string {
  const lastColon = key.lastIndexOf(':');
  if (lastColon < 0) return key;
  // Only strip the agent prefix for `agent:<id>:<tail>` patterns
  if (key.startsWith('agent:')) return key.slice(lastColon + 1);
  return key;
}

/**
 * Alias-aware session key comparison.
 *
 * Returns `true` when `a` and `b` refer to the same session, accounting for
 * the `"main"` ↔ `"agent:<id>:main"` equivalence.
 */
export function sessionKeysMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  // The only alias equivalence: "main" ↔ "agent:<id>:main"
  if (a === 'main' && AGENT_MAIN_RE.test(b)) return true;
  if (b === 'main' && AGENT_MAIN_RE.test(a)) return true;

  return false;
}
