# GreenLane — Business Case

Structured against the capstone deliverable: Findings · The Idea · Business Model ·
Feasibility. All figures are labelled either **sourced** or **illustrative**.

---

## 1. Findings

### 1.1 The rails shipped. The merchants didn't.

Between April 2025 and January 2026 the entire agentic payment stack landed:

- **Mastercard Agent Pay** (Apr 2025) — Agentic Tokens extending MDES with agent identity,
  consent policy and step-up rules bound to the token; broadly available through certified
  processors in 2026.
- **Mastercard Verifiable Intent** — a tamper-resistant record of what the user actually
  authorised. Transactions carrying a valid intent credential get *different fraud scoring,
  different liability assignment and different chargeback procedures*.
- **Visa Trusted Agent Protocol** (Oct 2025, with Cloudflare) — agent identity signed into
  HTTP headers via RFC 9421 / Web Bot Auth, verified against network-operated key directories.
- **UCP** (Google + Shopify, NRF Jan 2026) — discovery through post-purchase, endorsed by
  20+ including Mastercard, Visa, Stripe, Adyen, Amex.
- **ACP** (OpenAI + Stripe, Sept 2025; Meta joined) — delegated payment tokens, merchant of
  record preserved.
- **MAS SAFR** (Jul 2026) — runtime safeguards for AI agents in finance: policy-bound
  execution, real-time validation, auditability, interoperability.
- **PayNow Generation 2** — request-to-pay and structured data fields explicitly to
  facilitate agentic commerce.

### 1.2 The proof that readiness is the bottleneck

**ChatGPT Instant Checkout launched 29 Sept 2025 and was retired 4 March 2026** — roughly
a dozen Shopify merchants ever shipped against it. The reported causes were not consumer
demand and not the payment rails. They were merchant enablement: onboarding difficulty,
inaccurate product data, no multi-item carts, no loyalty connection. OpenAI moved checkout
back into merchants' own environments.

That is the single most important slide in this deck. **The first mass-market agentic
checkout died of merchant unreadiness**, and every check in the GreenLane rubric that maps
to a documented Instant Checkout failure is in the rubric because of it.

### 1.3 The customer and the specific pain

**Primary customer:** the Head of Digital / e-commerce lead at a mid-market to enterprise
SEA merchant (S$20m–500m online GMV), and the systems integrator or agency who delivers
for them.

Their specific pain, in their words:

> "We were told to be agent-ready. We have four protocol specs, three network programmes,
> a WAF that our security team will not let me open up, and a PSP who says 'contact your
> representative.' I cannot tell my CFO whether we are ready, and I cannot tell you what
> it costs us if we're not."

Concretely, they cannot answer four questions:

1. Is our bot management silently 403-ing every verified agent? *(No dashboard shows this.
   Blocked agents look like blocked bots.)*
2. Does our checkout actually complete for an agent, or only for a human with a mouse?
3. If an agent presents a token that is over its spend cap, do we decline it — or do we
   accept a charge whose liability we have just assumed?
4. When that transaction is disputed in five months, can we produce the mandate, the
   intent credential and the agent identity?

**Second customer:** PSPs and acquirers, who are being asked to register merchants for
agentic programmes and have no way to grade their own portfolio.

**Third customer:** networks and issuers, who must decide in ~100ms whether to approve an
agent-initiated authorisation and currently have no merchant-side readiness signal.

### 1.4 What exists today, and the gap

Free readiness scanners exist and are good: Shopify's commerce-readiness tool, Vercel's
"Is Agentic" (powered by Ora's 100+ checks), and agency audits at 47 to 126 points. Every
one of them scans the **public front of the store** — feeds, structured data, `llms.txt`,
discoverability. Not one of them executes a purchase.

| | Free scanners | GreenLane |
|---|---|---|
| Discovery & structured data | Yes | Yes (L0, also free) |
| Signature accept/reject matrix | No | Yes |
| Real checkout session, totals parity | No | Yes |
| Delegated-token money leg | No | Yes |
| Mandate-scope negative tests | No | Yes |
| Refund + dispute evidence | No | Yes |
| Signed, revocable, machine-verifiable credential | No | Yes |
| Consumable by a PSP or issuer at authorisation | No | Yes |

They are SEO for agents. We are the payments-grade certification of the money leg. Their
free reports are our top of funnel, not our competition — a merchant who scores well on
Vercel and then fails GreenLane P4.02 is our best possible sales conversation.

---

## 2. The idea

**GreenLane certifies that an AI agent can complete a real purchase at your store — and
issues a signed credential that agents, PSPs and issuers can verify at runtime.**

Three moves:

1. **Scan.** A headless agent runs the full journey against the merchant's sandbox:
   discovery, the eight-way signature challenge, checkout session, delegated-token
   authorisation, mandate-scope negative tests, idempotency, refund, dispute evidence.
2. **Certify.** ~120 checks across five pillars produce a **GreenLane Score (0–1000)** and
   a tier. Deterministic, versioned, evidence-backed, appealable. A **90-day W3C
   Verifiable Credential** is issued, published to a public registry, and revoked within
   minutes if a weekly re-run regresses.
3. **Remediate.** Failures come back as fixes: a config change for Shopify, a pull request
   through a GitHub App for custom stacks, and a CI gate so readiness cannot silently rot.

### Bootcamp concepts used — five, across four domains

| Concept | How it is used, specifically |
|---|---|
| **Emerging payments — agentic commerce** | The entire subject: UCP, ACP, AP2, Agent Pay agentic tokens, TAP, Web Bot Auth conformance |
| **Payments foundations — 4-party model, anatomy of a transaction, fees** | The rubric is organised around the transaction's actual anatomy — authorisation, capture, refund, dispute — and the score is priced into the fee stack (§3.3) |
| **Data-driven finance — transaction data into risk signals; rule-based vs AI/ML decisioning** | Scan telemetry becomes a merchant risk signal sold to issuers. The certification path is deliberately **rule-based** for auditability; ML is confined to calibration and remediation-ROI ranking (see ARCHITECTURE §5) |
| **Platforms & infrastructure — the pipes behind the platforms** | We sit in the pipes: a registry agents read, a portfolio product PSPs resell, a signal issuers score |
| **Crypto & PayFi** | Optional module: x402 / stablecoin agent rails tested as an alternate settlement path (P4.14), alongside PayNow request-to-pay |

### The user journey

**Merchant, day 1:** pastes a URL, gets a free L0 report in 40 seconds with a provisional
score and the three biggest gaps. **Day 2:** proves domain ownership by DNS TXT, unlocks
L1 — and discovers the WAF is blocking verified Mastercard and Visa agents. **Week 2:**
signs, connects a PSP sandbox, GreenLane runs the money leg and finds an over-cap token
being accepted. **Week 3:** remediation PRs merged, re-run passes, Gold certificate
issued, badge published at `/.well-known/greenlane-pass.json`. **Ongoing:** weekly re-runs,
CI gate on every deploy, alert when the UCP spec version moves.

**Agent, at runtime:** looks up the merchant in the registry, sees Gold, no open findings,
verified 3 days ago, and routes the purchase there rather than to an uncertified competitor.

---

## 3. Business model

### 3.1 Who pays

| Segment | Product | Price (illustrative, SGD) |
|---|---|---|
| Merchant — self-serve | L0/L1 free scan | S$0 (funnel) |
| Merchant — SMB | Certification, annual, one domain, 4 cycles | **S$4,800/yr** |
| Merchant — mid-market | Certification + continuous monitoring + CI gate | **S$1,200/mo** |
| Merchant — enterprise | Multi-brand, multi-market, remediation engineering | **S$60k–150k/yr** |
| PSP / acquirer | Portfolio scoring, white-labelled, per merchant per year | **S$180/merchant/yr**, volume-tiered |
| Network / issuer | Risk-signal API at authorisation | **S$0.012 per inquiry** |
| Agent platform | Registry reads | Free to 1M/mo, then metered |

### 3.2 Unit economics

Marginal delivery cost per full certification run is **≈ S$0.70** (ARCHITECTURE §9). A
mid-market merchant at S$1,200/mo consumes roughly S$8/yr of compute. Gross margin is
structurally 90%+; the real cost base is rubric authors and solutions engineers.

Illustrative CAC S$3,500 via the free-scan funnel and agency channel, against S$14,400 ARR
mid-market — payback under four months, LTV:CAC above 6:1 at 85% logo retention. Retention
is structurally high because the certificate expires in 90 days and the CI gate is wired
into their deploy pipeline: churning means going dark on a badge their agents already read.

### 3.3 Who earns what — an agentic S$100 order

Illustrative SEA card-not-present economics, showing where the agent inserts itself as a
fifth actor in the four-party model:

| Party | Take on S$100 | Note |
|---|---|---|
| Issuer (interchange) | ~S$1.30 | Agent-initiated CNP |
| Network (scheme fees) | ~S$0.13 | Plus tokenisation / agentic token service fees |
| Acquirer / PSP | ~S$0.90 + S$0.50 | Markup + per-transaction |
| **Agent platform (new)** | **~S$2.00–3.00** | Referral / take-rate — the new entrant in the fee stack |
| Merchant net | ~S$94 | Before the failure costs below |

The costs certification attacks are not in that table — they are the leakage underneath it:

- **Blocked verified agents.** Traffic that never becomes an order and never appears in an
  analytics funnel, because it looks like blocked bot traffic.
- **Failed agent checkouts.** The Instant Checkout failure mode, at merchant scale.
- **Disputes lost for want of evidence.** An agent order with no retrievable mandate or
  intent credential is an undefended chargeback.
- **Liability wrongly assumed.** Accepting an out-of-scope token forfeits the favourable
  liability treatment the intent credential was supposed to buy.

GreenLane is priced as a small fraction of that leakage. For a merchant doing S$50m online,
recovering even 0.2% of leaked agentic volume dwarfs a S$14k subscription — and the free
L0 scan is designed to size that number for them before they ever talk to sales.

### 3.4 Why the network cares

For Mastercard specifically, GreenLane produces something Agent Pay and Verifiable Intent
currently assume but cannot observe: **evidence that the merchant side of the contract
actually holds.** A merchant registered for an agentic programme whose integration accepts
over-cap tokens is a liability the network is carrying blind. A per-inquiry merchant
readiness signal, with stable reason codes, is a value-added service in exactly the shape
the network already sells — and it makes the intent-credential liability framework
enforceable rather than aspirational.

---

## 4. Feasibility

### 4.1 Technical

| Risk | Severity | Mitigation |
|---|---|---|
| **Protocol churn** — UCP, ACP, AP2, TAP all move | High | Adapter layer per protocol; rubric versioned and pinned per certificate; CI watches spec repos and auto-opens rubric-change PRs |
| Sandbox access — L3 needs merchant PSP test environments | High | PSP partnership is the wedge, not an afterthought: enrol through the PSP and sandbox access comes with it |
| False positives damaging trust | High | Deterministic checks only for hard fails; every finding carries replayable evidence; published appeals path |
| Never accidentally moving real money | Critical | Test-mode enforcement before first request and on every auth response; run aborts on any live-mode key; compensating void/refund guaranteed by Temporal |
| Standards bodies absorb the rubric | Medium | Publish the rubric openly and be its reference implementation; the defensible asset is the failure corpus and the credential's distribution, not the checklist |

### 4.2 Regulatory

- **MAS** has not created a separate category for AI-initiated payments — existing consumer
  protection, AML and KYC rules apply, and the agent is treated as an extension of the
  account holder. GreenLane is a testing and assurance service, not a payment institution:
  it holds no funds, moves no real money, and needs no PS Act licence. That is a deliberate
  design constraint, not an accident.
- **SAFR alignment** is the product's regulatory anchor. P5 tests the merchant's audit
  envelope against SAFR's four pillars, which turns "MAS published a white paper" into a
  line item a merchant can be scored on.
- **PDPA**: Singapore data residency, purpose limitation, streaming redaction of incidental
  PII at capture, DPO appointed at incorporation.
- **Selling to FIs** brings MAS TRM and outsourcing guidelines into scope — hence SOC 2
  Type II on the roadmap before the first FI contract.
- **Certification liability**: the credential is assurance of observed behaviour under a
  named rubric version at a timestamp — explicitly not a warranty — backed by professional
  indemnity cover.

### 4.3 Partner realities

The honest version: **GreenLane's value is a function of who accepts the credential.**

| Partner | What we need | What they get |
|---|---|---|
| PSP / acquirer (Singapore first) | Sandbox access + portfolio distribution | A readiness product for a merchant base they must now enrol in agentic programmes |
| Network (Mastercard) | Recognition of the credential; directory alignment | Observable merchant-side conformance; an enforceable liability framework; a VAS-shaped revenue line |
| Shopify / commerce platforms | App store distribution | Their merchants pass, their protocol adoption numbers improve |
| Agent platforms | Registry consumption | A shortlist of merchants whose checkouts will not fail mid-conversation |

Sequencing matters: PSP first (distribution and sandboxes), platform second (volume),
network third (the signal business, which only makes sense once coverage exists).

### 4.4 Go to market

**Singapore first**, and not for sentimental reasons: SAFR gives the rubric a local
regulatory anchor, PayNow Gen 2 gives a non-card agentic rail nobody else is testing, the
first authenticated agentic transaction in Southeast Asia happened here in March 2026, and
the merchant base is dense, English-speaking and PSP-concentrated enough that one
partnership reaches thousands of merchants. Then Malaysia and Indonesia through the same
PSP relationships, then Australia.

Funnel: free scan (PLG, viral through agency and LinkedIn benchmark reports) → domain
verification → certification → PSP portfolio deals → network signal.

### 4.5 What would kill this

Stated plainly, because a panel will ask:

1. **Agentic commerce stalls.** Instant Checkout's retirement is evidence the timing risk
   is real. Mitigation: the L0/L1 layer has value the moment agents merely *read* stores,
   which is already true and growing.
2. **A network or platform ships this for free.** The most likely competitive outcome.
   Mitigation: be the neutral, cross-network certifier — Mastercard will not certify
   conformance to Visa's protocol, Shopify will not certify a non-Shopify store. Neutrality
   is the position no incumbent can occupy.
3. **The credential never gets consumed.** Distribution risk, and the one that actually
   matters. Mitigation: sell the merchant-facing product on merchant-facing ROI alone; the
   registry and risk-signal businesses are upside, not the base case.

---

## 5. Ask

Pre-seed S$1.2m, 18 months: five people, rubric v1.0 through v1.3, one PSP partnership
live, 500 certified domains in Singapore and Malaysia, and one issuer consuming the risk
signal in a pilot authorisation flow.

---

## Sources

- Mastercard, *Agent Pay* announcement (29 Apr 2025) and agentic token framework
- Mastercard, *Verifiable Intent* and agentic commerce rules-of-the-road (2026)
- Visa / Cloudflare, *Trusted Agent Protocol* (14 Oct 2025); Cloudflare, *Securing agentic commerce*
- Google Developers Blog, *Under the Hood: Universal Commerce Protocol*; Google, NRF 2026 announcement
- Stripe / OpenAI, *Agentic Commerce Protocol* (29 Sept 2025), spec on GitHub
- CNBC, *OpenAI revamps shopping experience in ChatGPT after struggling with Instant Checkout* (24 Mar 2026)
- MAS, *Safeguards for Agentic Finance at Runtime (SAFR)* white paper, BuildFin.ai (Jul 2026)
- MAS / ABS, *PayNow Generation 2* study (2026)
- Shopify commerce-readiness tool; Vercel *Is Agentic* (Ora checks), Aug 2026
