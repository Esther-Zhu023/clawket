# Self-Hosting Clawket

This guide is for operators who clone the public repository and want to run Clawket on infrastructure they control.

## What You Need

- Node.js and npm
- an OpenClaw host that the bridge can control
- Xcode / Expo tooling only if you want to build the mobile app yourself

Cloudflare is optional. Clawket supports both:

- a relay-backed mode using `relay-registry` and `relay-worker`
- a direct mode using LAN IP, Tailscale IP, or another custom gateway URL

## 1. Install Dependencies

```bash
git clone <your-fork-or-clone-url>
cd clawket
npm install
```

## 2. Choose a Connection Path

### Option A: Direct local or Tailscale pairing

If you do not want to deploy relay infrastructure, you can pair directly against your OpenClaw gateway.

Auto-detect a LAN pairing URL:

```bash
npm run bridge:pair:local
```

Or provide an explicit local, Tailscale, or custom gateway URL:

```bash
npm run bridge:pair -- --local --url ws://100.x.x.x:18789
```

The mobile app can import or scan that QR payload and connect directly.

### Option B: Relay-backed pairing with Cloudflare

If you want a relay-backed path, prepare and deploy the registry and relay workers in your own Cloudflare account.

## 3. Prepare Cloudflare Worker Config

Copy the open-source-safe templates into local overrides:

```bash
cp apps/relay-registry/wrangler.local.example.toml apps/relay-registry/wrangler.local.toml
cp apps/relay-worker/wrangler.local.example.toml apps/relay-worker/wrangler.local.toml
```

Then fill in your own:

- `account_id`
- KV namespace IDs
- Durable Object bindings
- `RELAY_REGION_MAP`
- `REGISTRY_VERIFY_URL`
- any optional shared secret values

Tracked `wrangler.toml` files should stay generic.

## 4. Run or Deploy Relay Infrastructure

Local development:

```bash
npm run relay:dev:registry
npm run relay:dev:worker
```

Deploy to your Cloudflare account:

```bash
npm run relay:cf:whoami
npm run relay:deploy:registry
npm run relay:deploy:worker
```

## 5. Pair the Bridge Against Your Registry

From the repo root:

```bash
npm run bridge:pair -- --server https://registry.example.com
```

Or:

```bash
CLAWKET_REGISTRY_URL=https://registry.example.com npm run bridge:pair
```

The public-source CLI does not assume a hosted registry.

## 6. Configure the Mobile Build

If you are building the mobile app yourself, copy `apps/mobile/.env.example` to `.env.local` and set only the public values you actually want.

Examples:

- support/legal links for your own fork
- docs link for your own OpenClaw docs
- other optional integrations only if you operate those services yourself

If you leave those values empty, the app hides or disables those integrations.

Recommended local checks:

```bash
npm run mobile:config:show
npm run mobile:config:check
npm run mobile:config:check:ios
```

Direct Xcode `Build` / `Archive` flows read `apps/mobile/.env.local` through `apps/mobile/ios/.xcode.env`, so iOS bundle-time `EXPO_PUBLIC_*` values stay aligned with the local Expo config.

Private-service configuration and related self-hosting defaults are documented in [SELF_HOSTING_MODEL.md](../SELF_HOSTING_MODEL.md).

When you add a new mobile env variable:

1. add it to `apps/mobile/.env.example`
2. wire it through `apps/mobile/src/config/public.ts` if client runtime code needs it
3. update `apps/mobile/scripts/check-public-config.mjs` if your release flow should validate it
4. run `npm run mobile:config:check:ios` before archiving in Xcode

## 7. Verify

Recommended checks:

```bash
npm run typecheck
npm run test
```

Then validate the full flow manually:

1. choose either direct mode or relay mode
2. if using relay mode, deploy or run your registry and relay
3. pair the bridge with either a direct local URL or your own registry
4. scan or import the resulting pairing data in the mobile app
5. confirm that the connection uses your own endpoints

## Related Docs

- [docs/relay/CONFIGURATION.md](./relay/CONFIGURATION.md)
- [docs/relay/LOCAL-DEVELOPMENT.md](./relay/LOCAL-DEVELOPMENT.md)
- [docs/relay/ARCHITECTURE.md](./relay/ARCHITECTURE.md)
