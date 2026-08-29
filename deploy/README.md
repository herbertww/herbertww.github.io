# Deploying the pitch deck

The deck is a single self-contained HTML file — no framework, no bundler, no runtime
dependencies. `build.mjs` wraps the artifact fragment in
`docs/agentic-commerce-certifier/pitch-deck.html` into a standalone document, because the
Artifact host supplies `<!doctype>`, `<head>` and a small reset at publish time and a plain
static host does not.

```bash
node deploy/build.mjs        # → deploy/public/index.html
```

## Cloudflare Workers

Deploying needs your own Cloudflare account — the login is interactive and the credentials
are yours, so this has to be run from your machine, not from a Claude session.

```bash
npm install -g wrangler
wrangler login                       # opens a browser, one time
wrangler deploy -c deploy/wrangler.jsonc
```

Prints `https://greenlane-pitch.<your-subdomain>.workers.dev`. Redeploy after any edit by
re-running `build.mjs` then `wrangler deploy`.

To use a non-interactive token instead of `wrangler login`, create one at
**dash.cloudflare.com → My Profile → API Tokens** with the *Edit Cloudflare Workers*
template, then:

```bash
export CLOUDFLARE_API_TOKEN=...      # never commit this
wrangler deploy -c deploy/wrangler.jsonc
```

## Verifying before you demo

`verify.mjs` drives the page in headless Chromium — it runs the demo, asserts the score,
verdict, finding count and remediation block in both light and dark themes, and fails the
build if the deck regresses.

```bash
npm install --no-save playwright-core
node deploy/verify.mjs
```
