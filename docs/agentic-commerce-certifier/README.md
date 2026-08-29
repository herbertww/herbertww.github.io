# GreenLane — Agentic Commerce Readiness Certifier

> The certification layer between "an AI agent can read your store" and "the network will approve the payment."

SMU FinTech Bootcamp capstone. Three documents:

| Document | What it covers |
|---|---|
| [`CERTIFICATION-SPEC.md`](./CERTIFICATION-SPEC.md) | The rubric — 5 pillars, ~120 checks, the 0–1000 GreenLane Score, tiering and hard-fail gates. This is the product IP. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical architecture, tech stack, deployment topology, security/compliance posture, cost model, build plan. |
| [`BUSINESS-CASE.md`](./BUSINESS-CASE.md) | Findings, idea, business model, unit economics, feasibility, GTM, risks — the narrative behind the pitch deck. |

## One-paragraph summary

Agent-initiated checkout is live on real rails — Mastercard Agent Pay with Agentic Tokens, Visa Trusted Agent Protocol, Google/Shopify UCP, Stripe/OpenAI ACP — but the first mass-market attempt at it (ChatGPT Instant Checkout) was retired in March 2026 after roughly a dozen merchants shipped against it, undone by merchant enablement, stale product data and missing cart/loyalty support. The rails work; the merchants are not ready, and nobody can tell which ones are. GreenLane runs a real agent-initiated purchase against a merchant's sandbox — through discovery, signature verification, checkout, the delegated-token money leg, refund and dispute evidence — scores it 0–1000 against a versioned rubric, and issues a signed, revocable credential that agents, PSPs and issuers can verify at runtime. Free scanners tell a merchant whether an agent can *read* the store. GreenLane certifies whether the *money* completes.
