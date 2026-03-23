# Local Development

This guide covers local development for the registry worker and relay worker. It does not require any private infrastructure.

## 1. Install Dependencies

```bash
cd /path/to/clawket
npm install
```

## 2. Prepare Local Wrangler Overrides

Create untracked local override files before remote dev or deploy work:

```bash
cp apps/relay-registry/wrangler.local.example.toml apps/relay-registry/wrangler.local.toml
cp apps/relay-worker/wrangler.local.example.toml apps/relay-worker/wrangler.local.toml
```

Then replace the placeholder values with resources from your own Cloudflare account.

Important:

1. Do not put real account IDs or KV IDs into tracked `wrangler.toml` files.
2. If your Wrangler login can access multiple accounts, set `account_id` explicitly in both local override files.

## 3. Start The Registry Worker

```bash
npm run relay:dev:registry
```

The local endpoint is usually `http://127.0.0.1:8787`.

## 4. Start The Relay Worker

In a second terminal:

```bash
npm run relay:dev:worker
```

The local endpoint is usually `http://127.0.0.1:8788`.

## 5. Register A Gateway

```bash
curl -X POST http://127.0.0.1:8787/v1/pair/register \
  -H 'content-type: application/json' \
  -d '{"displayName":"Demo Gateway","preferredRegion":"us"}'
```

Example response:

```json
{
  "gatewayId": "gw_...",
  "relaySecret": "grs_...",
  "relayUrl": "ws://127.0.0.1:8788/ws",
  "accessCode": "ABC234",
  "accessCodeExpiresAt": "2026-03-22T00:00:00.000Z",
  "displayName": "Demo Gateway",
  "region": "us"
}
```

## 6. Claim The Access Code

One-time pairing `accessCode` values are 6-character uppercase codes from `ABCDEFGHJKMNPQRSTVWXYZ23456789`. Claim remains backward-compatible with older unclaimed 6-digit numeric codes.

```bash
curl -X POST http://127.0.0.1:8787/v1/pair/claim \
  -H 'content-type: application/json' \
  -d '{"gatewayId":"<gatewayId>","accessCode":"<accessCode>","clientLabel":"iPhone"}'
```

## 7. Verify A Pairing Token

Use either a `relaySecret` or a `clientToken`:

```bash
curl -H 'Authorization: Bearer <relaySecret-or-clientToken>' \
  http://127.0.0.1:8787/v1/verify/<gatewayId>
```

## 8. Connect To The Relay WebSocket

Gateway example with legacy query-token auth:

```bash
npx wscat -c 'ws://127.0.0.1:8788/ws?gatewayId=<gatewayId>&role=gateway&token=<relaySecret>'
```

Client example with bearer auth:

```bash
npx wscat \
  -c 'ws://127.0.0.1:8788/ws?gatewayId=<gatewayId>&role=client&clientId=test-client' \
  -H 'Authorization: Bearer <clientToken>'
```

You can replace `wscat` with any equivalent WebSocket client or your own bridge/client implementation.

## 9. Run Tests

```bash
npm run typecheck
npm run test
npm run relay:test:integration
```

## 10. Deploy To Your Own Cloudflare Account

Before deploys, confirm the current account:

```bash
npm run relay:cf:whoami
```

Deploy commands:

```bash
npm run relay:deploy:registry
npm run relay:deploy:worker
```

These scripts automatically prefer `wrangler.local.toml` when present.
