# Public Repo and Self-Hosting

This file explains what the public Clawket repository is for, what it includes, and what it does not include.

## What the Public Repo Includes

The public repository includes:

- the mobile app source
- the bridge CLI and bridge runtime
- the public relay-registry and relay-worker code
- direct local pairing support for LAN / Tailscale / custom gateway URLs
- local development templates for Cloudflare deployment
- self-hosting documentation

The public repository is meant to be usable without any private hosted dependency baked into the source tree.

## What the Public Repo Does Not Include

The public repository does not include:

- a private production registry URL
- a private production relay URL
- private Cloudflare account IDs, KV IDs, or route bindings
- private analytics credentials
- private RevenueCat credentials
- private support, privacy, terms, or App Store defaults
- private deployment secrets

If you clone this repository, assume you are bringing either your own infrastructure or your own direct-connection setup, plus any optional product integrations you want to enable.

## The Self-Hosting Path

Clawket self-hosting means:

- you run the bridge and OpenClaw on infrastructure you control
- for relay mode, you deploy the registry and relay workers in your own Cloudflare account
- for relay mode, you pair the bridge against your own registry endpoint
- for direct mode, you can pair over LAN, Tailscale, or another custom gateway URL without deploying relay infrastructure
- you point the mobile app at your own endpoints through QR payloads, manual entry, or your own app build defaults

The relay is transport. It is not the OpenClaw runtime and it is not your operator workstation.

## Public Source vs Official Release Config

The public repository stays generic on purpose:

- GitHub source checkouts should stay self-host friendly
- official hosted defaults should stay out of Git
- optional branded or paid integrations should be injected at release time, not hardcoded in the source checkout

In practice, that means:

- `clawket pair` needs `--server` or `CLAWKET_REGISTRY_URL`
- `clawket pair --local` is available when you want direct local pairing instead of relay infrastructure
- checked-in Cloudflare config uses placeholders only
- mobile analytics, docs, support, and legal links are disabled unless explicitly configured
- RevenueCat-backed billing is optional; if it is not configured, the app defaults to unlocked Pro access
- those capabilities are still supported; the public repo just requires explicit configuration instead of hardcoded hosted values

## Optional Private Services

The public repository supports optional private services, but it does not advertise or hardcode them in the main README.

Current examples include:

- PostHog for analytics
- RevenueCat for subscription billing

If you operate those services yourself, configure them through `apps/mobile/.env.example` and your local or release-time environment.

Relevant mobile app variables include:

- PostHog: `EXPO_PUBLIC_POSTHOG_ENABLED`, `EXPO_PUBLIC_POSTHOG_HOST`, `EXPO_PUBLIC_POSTHOG_API_KEY`
- RevenueCat: `EXPO_PUBLIC_REVENUECAT_ENABLED` plus the platform API keys and product identifiers used by your build

Behavior defaults:

- if PostHog is not configured, analytics stays disabled in the app
- if RevenueCat is configured, the app uses the normal subscription gating and paywall flows
- if RevenueCat is not configured, the public or self-hosted build skips subscription billing and defaults to unlocked Pro access

## Keep These Private

If you fork or self-host Clawket, keep these things out of the public repo:

- real relay hostnames
- real registry hostnames
- Cloudflare account IDs and namespace IDs
- analytics credentials
- RevenueCat credentials
- private support email aliases
- release-only defaults used for App Store or package publishing

Those belong in your own environment, local config, or release pipeline.
