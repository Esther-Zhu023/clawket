# Security Policy

## Reporting

If you find a security issue, do not open a public issue with exploit details.

Report it privately via email to **support@clawket.ai**, or use [GitHub Security Advisories](https://github.com/nicepkg/clawket/security/advisories/new) to coordinate a private disclosure.

## Scope

The most important areas for review in this repository are:

- pairing and access-code flows
- relay authentication and websocket routing
- bridge-side token handling
- mobile QR parsing and connection bootstrapping
- any logging path that could leak credentials or message payloads

## Public Repo Rules

Do not commit:

- real registry or relay production URLs
- Cloudflare account IDs, KV IDs, Durable Object IDs, or route bindings
- analytics or billing secrets
- APNs, signing, or release credentials
- internal-only operational links or escalation paths

Use placeholder domains such as `example.com` in tracked files.
