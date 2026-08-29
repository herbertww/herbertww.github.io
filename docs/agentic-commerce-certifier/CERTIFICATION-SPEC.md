# GreenLane Certification Spec v1.0

The rubric is the product. Everything else — the crawler, the dashboard, the badge — is
delivery mechanism. This document defines what is tested, how it is scored, and what a
merchant has to do to lose certification.

Design rules the rubric obeys:

1. **Deterministic checks decide certification.** An LLM may explain, prioritise or
   summarise a finding, but no check whose verdict comes from a model can hard-fail a
   merchant. Certification must be appealable, reproducible and defensible to a regulator.
2. **Every check emits evidence.** A check result without a stored artifact (HTTP
   exchange, HAR, screenshot, signed response, ledger entry) is a bug, not a finding.
3. **Every check names its source of authority.** A spec section, network rule, or
   regulatory reference. "Best practice" is not an authority; those checks are advisory
   and score zero weight.
4. **Versioned and dated.** Rubric releases are semver'd and pinned into every
   certificate. A merchant certified under v1.0 is not silently re-graded under v1.1.

---

## 1. The five pillars

| # | Pillar | Weight | The question it answers |
|---|---|---|---|
| P1 | **Discoverability** | 15% | Can an agent find and correctly understand what you sell? |
| P2 | **Agent Identity & Access** | 20% | Do you let good agents in, keep bad ones out, and prove which is which? |
| P3 | **Machine Checkout** | 25% | Can an agent complete a purchase without a human, correctly, once? |
| P4 | **Money Integrity** | 30% | Does the money leg settle, refund, and defend itself under dispute? |
| P5 | **Governance & Audit** | 10% | Can you reconstruct, months later, what the agent was authorised to do? |

P4 carries the largest weight because it is the pillar no free tool tests and the one
that determines whether a transaction is approved, disputed, or written off.

---

## 2. Pillar detail

### P1 — Discoverability (15%)

| ID | Check | Authority | Type |
|---|---|---|---|
| P1.01 | `/.well-known/ucp` manifest present, parses, declares services and capability JSON Schemas | UCP spec | Hard |
| P1.02 | Declared capabilities match live endpoint behaviour (no phantom capabilities) | UCP spec | Hard |
| P1.03 | ACP product feed reachable, schema-valid, refreshed < 24h | ACP spec | Scored |
| P1.04 | `schema.org/Product` + `Offer` on every PDP with `price`, `priceCurrency`, `availability`, `gtin`/`sku` | schema.org | Scored |
| P1.05 | Feed↔PDP parity: price, currency, availability, title, image for a 200-SKU sample | GreenLane | Hard |
| P1.06 | Variant model resolvable (size/colour → purchasable SKU) without JS execution | GreenLane | Scored |
| P1.07 | `robots.txt` / `llms.txt` state an explicit, non-contradictory agent policy | IETF drafts | Scored |
| P1.08 | Machine-readable returns, shipping, warranty and price-match policy at a stable URL | UCP `dev.ucp.shopping` | Scored |
| P1.09 | Catalogue localisation: currency, tax-inclusive pricing and shipping destinations declared per market | GreenLane | Scored |

*Failure mode this catches:* the exact one that killed Instant Checkout — a store that
looks fine to a human while the agent-facing surface serves stale prices and
out-of-stock SKUs.

### P2 — Agent Identity & Access (20%)

The **signature challenge matrix**. GreenLane sends the same purchase-intent request eight
ways and asserts the merchant's accept/reject behaviour. This is the single hardest thing
for a merchant to self-test and the fastest to regress.

| ID | Request variant | Expected origin behaviour |
|---|---|---|
| P2.01 | Valid RFC 9421 signature, key in Visa TAP directory, `tag=agent-payer-auth` | Accept, no CAPTCHA, no rate-limit |
| P2.02 | Valid signature, key in Mastercard Agent Pay directory | Accept |
| P2.03 | Valid signature, `tag=agent-browser-auth` on a checkout endpoint | Reject (wrong tag for purchase) |
| P2.04 | Expired `created`/`expires` window | Reject |
| P2.05 | Replayed `nonce` | Reject (replay protection present) |
| P2.06 | Signature valid, `keyid` not in any registered directory | Reject or step-up |
| P2.07 | Tampered body, otherwise valid signature | Reject |
| P2.08 | Unsigned request with an agent-like User-Agent | Reject or step-up, **never** silently accept |

| ID | Check | Type |
|---|---|---|
| P2.10 | Bot management does not block verified agents (no CAPTCHA/JS-challenge on the accept cases above) | Hard |
| P2.11 | Directory public keys fetched and cached correctly; key rotation honoured within 24h | Scored |
| P2.12 | Agent traffic is rate-limited separately from human traffic, with documented limits | Scored |
| P2.13 | Rejections return a machine-readable reason, not a 403 HTML wall | Scored |

*Failure mode this catches:* a merchant whose WAF quietly 403s every verified agent —
invisible on a human-run readability scan, and pure lost revenue.

### P3 — Machine Checkout (25%)

Driven end-to-end by a headless agent in the merchant's sandbox or test mode.

| ID | Check | Type |
|---|---|---|
| P3.01 | `POST /checkout-sessions` accepts a valid UCP/ACP payload and returns a session with totals | Hard |
| P3.02 | Totals are complete and correct: line items + tax + shipping + fees = charged amount, to the cent | Hard |
| P3.03 | Session mutation (`PUT`) applies discount codes with a per-line allocation breakdown | Scored |
| P3.04 | Multi-item cart supported (≥ 3 distinct SKUs, mixed variants) | Hard |
| P3.05 | **Idempotency**: identical `idempotency-key` replayed 3× yields one order, one charge | Hard |
| P3.06 | Concurrent sessions on the last unit of inventory: exactly one wins, the other gets a typed out-of-stock error | Scored |
| P3.07 | Price change between session creation and payment is surfaced, not silently absorbed | Hard |
| P3.08 | Typed, documented error taxonomy (not HTTP 500 with an HTML body) | Scored |
| P3.09 | Loyalty / member pricing resolvable by an agent, or explicitly declared unsupported | Scored |
| P3.10 | Guest checkout path exists (no forced account creation mid-flow) | Scored |
| P3.11 | p95 checkout-session latency < 1.5s; no step that requires human-only interaction | Scored |

### P4 — Money Integrity (30%)

Run against PSP sandbox credentials with network test cards and test-mode agentic tokens.
**GreenLane never touches live cardholder data and never moves real money.**

| ID | Check | Type |
|---|---|---|
| P4.01 | Delegated / agentic token (Mastercard Agent Pay, ACP shared payment token) accepted end-to-end to authorisation | Hard |
| P4.02 | **Mandate scope enforced — over-cap**: amount above the token's spend cap must decline | Hard |
| P4.03 | **Mandate scope enforced — wrong MCC/merchant**: out-of-scope token must decline | Hard |
| P4.04 | **Mandate scope enforced — expired window**: must decline | Hard |
| P4.05 | Revoked token declines on next authorisation (revocation propagates) | Hard |
| P4.06 | Verifiable Intent / mandate credential is verified before capture and the result is stored | Hard |
| P4.07 | Agent-initiated indicators are populated correctly in the authorisation message | Scored |
| P4.08 | Step-up (passkey / 3DS) triggers at the declared threshold and completes | Scored |
| P4.09 | Auth-to-capture window and partial capture behave as declared | Scored |
| P4.10 | **Double-charge probe**: network timeout after auth, then retry — no duplicate charge | Hard |
| P4.11 | Refund via API completes and is reflected in the agent-visible order state | Hard |
| P4.12 | Dispute evidence bundle retrievable for an agent order: mandate, intent credential, agent identity, item snapshot, delivery proof | Hard |
| P4.13 | Decline reasons returned to the agent are actionable and typed | Scored |
| P4.14 | Alternate rail declared where relevant (PayNow request-to-pay with structured reference, or x402/stablecoin) | Scored |
| P4.15 | Reconciliation: settlement report carries the agent and mandate reference | Scored |

*Failure mode this catches:* a merchant whose integration "works" on the happy path but
accepts an over-cap token — which is a chargeback the merchant will lose and a liability
position the network assumed was covered.

### P5 — Governance & Audit (10%)

| ID | Check | Authority | Type |
|---|---|---|---|
| P5.01 | Per-transaction audit envelope: agent ID, mandate ID, policy evaluated, decision, timestamp | MAS SAFR | Hard |
| P5.02 | Envelope shape is interoperable and machine-comparable across agents | MAS SAFR | Scored |
| P5.03 | Pre-execution policy check recorded before the action, not reconstructed after | MAS SAFR | Scored |
| P5.04 | Human-in-the-loop threshold declared and enforced for high-value orders | MAS SAFR | Scored |
| P5.05 | Consent artifacts retained for the dispute window; retrievable by order ID | Scheme rules | Hard |
| P5.06 | Personal data in agent flows handled per PDPA: purpose stated, retention bounded, no PII in feeds | PDPA | Hard |
| P5.07 | Data residency of agent-flow records declared | GreenLane | Scored |

---

## 3. Scoring

```
pillar_score  = 1000 × Σ(weight_i × result_i) / Σ(weight_i)      # per pillar, advisory checks weight 0
GreenLaneScore = Σ(pillar_weight_p × pillar_score_p)             # 0–1000
```

`result_i ∈ {1.0 pass, 0.5 partial, 0.0 fail}`. Partial credit is defined per check —
never at the grader's discretion.

**Hard-fail gates.** Any failed `Hard` check caps the certificate regardless of score:

| Condition | Outcome |
|---|---|
| Any P4 hard check fails | **Not certified.** No tier, no badge. |
| Any P2 hard check fails | Capped at Bronze |
| Any P1/P3/P5 hard check fails | Capped at Silver |

**Tiers.**

| Tier | Score | Meaning |
|---|---|---|
| **Gold** | ≥ 850, zero hard fails | Autonomous purchase safe, including unattended re-orders |
| **Silver** | ≥ 700, zero hard fails | Agent purchase safe with step-up on high value |
| **Bronze** | ≥ 550 | Agent-discoverable and transactable with human confirmation |
| **Uncertified** | < 550 or any P4 hard fail | Report issued, no credential |

**Reason codes.** Every failed check maps to a stable code (`GL-P4-02-OVERCAP`) so a PSP
or issuer can act on the signal without parsing prose. This is the format the risk-signal
API returns.

---

## 4. The credential

A W3C Verifiable Credential 2.0, Ed25519, issuer `did:web:greenlane.sg`:

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2", "https://greenlane.sg/ctx/v1"],
  "type": ["VerifiableCredential", "AgenticCommerceReadinessCredential"],
  "issuer": "did:web:greenlane.sg",
  "validFrom": "2026-08-29T00:00:00Z",
  "validUntil": "2026-11-29T00:00:00Z",
  "credentialStatus": { "type": "StatusList2021Entry", "statusListIndex": "41822" },
  "credentialSubject": {
    "id": "https://merchant.example.sg",
    "rubricVersion": "1.0.0",
    "score": 883,
    "tier": "gold",
    "pillars": { "P1": 902, "P2": 870, "P3": 915, "P4": 861, "P5": 840 },
    "protocols": ["ucp/2026-01", "acp/2026-04-17", "ap2/0.9", "tap/1.0"],
    "openFindings": [],
    "evidenceDigest": "sha256:9f2b…",
    "lastVerified": "2026-08-29T02:11:04Z"
  }
}
```

Properties that matter:

- **Short-lived (90 days) and continuously re-verified.** Weekly re-runs; a regression
  revokes via status list within minutes, not at the next annual audit.
- **Verifiable offline** against published JWKS, and online for revocation state.
- **Served two ways**: merchant publishes it at `/.well-known/greenlane-pass.json`, and
  the GreenLane registry answers `GET /v1/pass?domain=` for agents and issuers.
- **Scoped, not a warranty.** The credential asserts observed behaviour of a named domain
  under rubric v1.0 at a timestamp. It is assurance, not indemnity — and the wording says so.

---

## 5. Rubric governance

- Spec repos (UCP, ACP, AP2, TAP, Web Bot Auth) are watched by CI. A published spec diff
  opens a rubric-change PR automatically with the affected check IDs listed.
- Rubric changes ship on a 60-day notice: announced, then advisory for one cycle, then
  scored. Merchants are never surprise-downgraded by a rubric release.
- A published appeals path: a merchant can contest any finding, and the stored evidence
  artifact is what settles it.
- The rubric text is public. The corpus of failure data behind the weightings is not.
