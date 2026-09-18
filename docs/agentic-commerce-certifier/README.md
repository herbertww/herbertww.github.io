# GreenLane — Agentic Commerce Readiness Certifier

> The certification layer between "an AI agent can read your store" and "the network will
> approve the payment."

SMU FinTech Bootcamp capstone.

## What this is, in plain language

Soon people will tell an AI assistant "order more dog food" and the assistant will go and
buy it. For that to work, a shop's website has to work for a robot shopper, not just for a
human with a mouse. Almost none of them do. OpenAI tried exactly this with ChatGPT Instant
Checkout: about a dozen shops ever shipped it, and it was pulled in March 2026. The payment
rails worked. The shops were not ready, and nobody could tell which ones were.

GreenLane sends a robot shopper into a shop's test environment and tries to genuinely buy
something — all the way through the payment, a refund, and the paperwork you would need
months later if the customer disputed it. It grades the shop out of 1000 and issues a
certificate that other robots, payment processors and card issuers can check automatically
before they send business there.

Five things get checked:

1. **Can a robot find and understand what you sell?** The price and stock level a robot
   reads off your machine-readable product list has to match what is really on the page.
2. **Do you let good robots in and keep fake ones out?** Most shops run bot-blocking
   software that blocks every robot, including legitimate ones carrying a verified identity
   from Visa or Mastercard. The shop loses the sale and never finds out, because a blocked
   robot looks exactly like blocked spam.
3. **Can a robot get through checkout on its own?** Several items, a discount code, totals
   that add up to the cent, and one order rather than two if it submits twice.
4. **Does the money part behave safely?** When you send an AI shopping you give it a limit —
   up to this much, at this shop, this week — and that limit travels with the payment. A
   shop that approves a charge over the limit has accepted a chargeback it will lose.
5. **Can you show your records afterwards?** Which robot, what it was allowed to do, what
   you decided, and when.

Free scanners tell a merchant whether an agent can *read* the store. GreenLane certifies
whether the *money* completes.

## The documents

| Document | What it covers |
|---|---|
| [`CERTIFICATION-SPEC.md`](./CERTIFICATION-SPEC.md) | The rubric — 5 pillars, 120 checks, the 0–1000 GreenLane Score, weights, partial credit, tiering and hard-fail ceilings. This is the product IP. |
| [`TRUST-MODEL.md`](./TRUST-MODEL.md) | Why anyone should believe the certificate. The TLS/WebPKI mapping, the missing root program, validation integrity, transparency, and what the certificate actually binds. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical architecture, tech stack, deployment topology, security/compliance posture, cost model, build plan. |
| [`BUSINESS-CASE.md`](./BUSINESS-CASE.md) | Findings, idea, business model, unit economics, feasibility, GTM, risks — the narrative behind the pitch deck. |
| [`pitch-deck.html`](./pitch-deck.html) | The 10-minute deck, with a scripted demo run. Self-contained. |

## One-paragraph summary

Agent-initiated checkout is live on real rails — Mastercard Agent Pay with Agentic Tokens,
Visa Trusted Agent Protocol, Google/Shopify UCP, Stripe/OpenAI ACP — but the first
mass-market attempt at it (ChatGPT Instant Checkout) was retired in March 2026 after roughly
a dozen merchants shipped against it, undone by merchant enablement, stale product data and
missing cart/loyalty support. The rails work; the merchants are not ready, and nobody can
tell which ones are. GreenLane runs a real agent-initiated purchase against a merchant's
sandbox — through discovery, signature verification, checkout, the delegated-token money leg,
refund and dispute evidence — scores it 0–1000 against a versioned rubric, and issues a
signed, revocable credential that agents, PSPs and issuers can verify at runtime. Free
scanners tell a merchant whether an agent can *read* the store. GreenLane certifies whether
the *money* completes.

## Status

The rubric is complete and internally consistent: 120 checks, every one carrying an
authority and an integer weight, partial credit written down per check, and a tier
derivation that cannot contradict itself. Nothing is built. `TRUST-MODEL.md` §7 lists what
has to be settled before a first certificate could honestly be issued.
