# GreenLane Certification Spec v1.0

The rubric is the product. Everything else — the crawler, the dashboard, the badge — is
delivery mechanism. This document defines what is tested, how it is scored, and what a
merchant has to do to lose certification.

Companion documents: [`TRUST-MODEL.md`](./TRUST-MODEL.md) defines who trusts the
credential and why, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) defines how a run executes.

Design rules the rubric obeys:

1. **Deterministic checks decide certification.** An LLM may explain, prioritise or
   summarise a finding, but no check whose verdict comes from a model can hard-fail a
   merchant. Certification must be appealable, reproducible and defensible to a regulator.
2. **Every check emits evidence.** A check result without a stored artifact (HTTP
   exchange, HAR, screenshot, signed response, ledger entry) is a bug, not a finding.
3. **Every check names its source of authority.** A spec section, network rule, or
   regulatory reference. "Best practice" is not an authority; those checks are advisory
   and score zero weight. See §2.1 for what each authority label means.
4. **Every check carries an integer weight and, if it can score partial credit, a written
   condition for it.** A score no third party can recompute from the evidence is not a
   certification, and §3 exists so that anyone holding a run's evidence can recompute it.
5. **Versioned and dated.** Rubric releases are semver'd and pinned into every
   certificate. A merchant certified under v1.0 is not silently re-graded under v1.1.

> **Completion note (2026-09).** v1.0 as first drafted enumerated 54 of its intended 120
> checks, stated a scoring formula that referenced per-check weights it never assigned,
> and carried a tier table that contradicted its own hard-fail gates. This revision
> completes v1.0 rather than superseding it: the full check set is enumerated, every check
> carries an authority and a weight, partial credit is written down per check, and §3.5
> resolves the tier conflict. No certificate has been issued under v1.0, so the 60-day
> change-notice obligation in §6 is not triggered. Certificates issued from here pin
> `1.0.0`.

---

## 1. The five pillars

| # | Pillar | Weight | Checks | The question it answers |
|---|---|---|---|---|
| P1 | **Discoverability** | 15% | 20 | Can an agent find and correctly understand what you sell? |
| P2 | **Agent Identity & Access** | 20% | 26 | Do you let good agents in, keep bad ones out, and prove which is which? |
| P3 | **Machine Checkout** | 25% | 26 | Can an agent complete a purchase without a human, correctly, once? |
| P4 | **Money Integrity** | 30% | 32 | Does the money leg settle, refund, and defend itself under dispute? |
| P5 | **Governance & Audit** | 10% | 16 | Can you reconstruct, months later, what the agent was authorised to do? |

120 checks. P4 carries the largest weight because it is the pillar no free tool tests and
the one that determines whether a transaction is approved, disputed, or written off.

---

## 2. Reading the check tables

Every check table carries four columns beyond the check text:

- **Authority** — the source that makes this check legitimate (§2.1).
- **Type** — `Hard` or `Scored` (§2.2).
- **W** — the check's integer weight within its pillar (§3.1).

### 2.1 Authority labels

| Label | Means |
|---|---|
| `UCP` / `ACP` / `AP2` / `TAP` | A requirement stated in that protocol specification, at the version pinned for the run |
| `RFC 9421` / `Web Bot Auth` | A requirement of the HTTP Message Signatures RFC or the Web Bot Auth draft |
| `Agent Pay` / `Verifiable Intent` | A Mastercard programme rule for agentic tokens or intent credentials |
| `Scheme rules` | A card network operating regulation applying to the transaction class |
| `MAS SAFR` | A safeguard named in the MAS Safeguards for Agentic Finance at Runtime paper |
| `PDPA` | A Singapore Personal Data Protection Act obligation |
| `PCI DSS` | A PCI DSS requirement bearing on the merchant's handling of the money leg |
| `schema.org` | A structured-data vocabulary requirement |
| `GreenLane` | **An empirical rule, not an opinion.** Reserved for checks traceable to a documented failure — the ChatGPT Instant Checkout post-mortem, or a failure observed in GreenLane's own corpus and recorded with its case reference. A check that cannot name either does not get this label; it is advisory at weight 0. |

Rule 3 forbids "best practice" as an authority. `GreenLane` is admissible only under the
definition above, and each such check carries its case reference in the rubric source.

### 2.2 Hard and Scored

| Type | Scores | Partial credit | Gate effect |
|---|---|---|---|
| `Hard` | Yes, at its full weight | **No — binary only.** You do not half-decline an over-cap token | A failure applies a tier ceiling (§3.5) |
| `Scored` | Yes, at its full weight | Yes, where §3.3 defines the condition | None |
| `Advisory` | No — weight 0 | n/a | None |

A Hard check is not a gate *instead of* being scored. It is scored like any other check
**and** carries a ceiling. This is the single most common misreading of v1.0.

---

## 3. Scoring

### 3.1 The arithmetic

Each check carries an integer weight on a fixed four-point scale, so that weights are
comparable across pillars and a reader can see why a check matters:

| Band | W | Used for |
|---|---|---|
| Critical | 5 | The check's failure means money moves wrongly, or a verified agent cannot transact at all |
| Major | 3 | The check's failure degrades agent transactions materially but does not break them |
| Minor | 2 | The check's failure is a friction or a transparency gap |
| Advisory | 0 | Scored for reporting only, never for certification |

For each pillar, over its **applicable** checks (§3.4):

```
pillar_score_p  = 1000 × Σ(W_i × r_i) / Σ(W_i)

GreenLaneScore  = round( Σ_p ( pillar_weight_p × pillar_score_p ) )
```

where `r_i ∈ {1.0 pass, 0.5 partial, 0.0 fail}` and `pillar_weight_p` is the fraction from
§1 (0.15, 0.20, 0.25, 0.30, 0.10, summing to 1.0). Both results are on 0–1000. Rounding is
half-up, applied once, to the final score only.

Pillar weight totals, for anyone recomputing: P1 Σ W = 57, P2 Σ W = 89, P3 Σ W = 82,
P4 Σ W = 112, P5 Σ W = 49. These are the denominators when no check is excluded.

Pillar scores are carried into the final sum **unrounded**; only the GreenLaneScore is
rounded. A report that displays a rounded pillar score is displaying it, not computing
with it.

### 3.2 Worked example

A merchant fails P4.02 (over-cap accepted, W 5, Hard), partials P4.07 (W 3) and P4.15
(W 3), and passes the other 29 P4 checks. No P4 check is excluded.

```
Σ(W_i)           = 112
Σ(W_i × r_i)     = 112 − (5 × 1.0) − (3 × 0.5) − (3 × 0.5)   = 104
pillar_score_P4  = 1000 × 104 / 112                          = 928.571…   (displayed 929)
```

With P1 890, P2 940, P3 910, P5 880 by the same method:

```
GreenLaneScore = 0.15(890) + 0.20(940) + 0.25(910) + 0.30(928.571…) + 0.10(880)
               = 133.5 + 188 + 227.5 + 278.571… + 88
               = 915.571…                                     → 916
```

916 is a Gold score. It is **not** a Gold certificate: P4.02 is a Hard check and its
failure ceilings the merchant at Uncertified under §3.5. A high score with a failed money
check is exactly the case the ceiling exists for, and the report says so in those words.

### 3.3 Partial credit

`r = 0.5` is available only on `Scored` checks, only in the case written here. A grader has
no discretion to award it anywhere else, and a run that does is a defect.

| Check | `r = 0.5` when |
|---|---|
| P1.03 | Feed reachable and schema-valid, staleness between 24h and 72h |
| P1.04 | `Product` + `Offer` complete on ≥ 90% of sampled PDPs, or exactly one of `gtin`/`sku` present throughout |
| P1.06 | Variants resolvable only with JS execution |
| P1.07 | A policy is declared and is not self-contradictory, but only in one of `robots.txt` / `llms.txt` |
| P1.08 | Policies at a stable URL but human-readable only, not machine-readable |
| P1.09 | Currency and tax treatment declared per market, shipping destinations not |
| P1.10 | HTTPS chain valid, one or more mixed-content references on sampled PDPs |
| P1.11 | Version declared but not matching a pinned supported version, and degrading cleanly |
| P1.12 | Full traversal completes, but only below a rate the declared feed refresh interval requires |
| P1.13 | Identifiers stable across refreshes for ≥ 99% of SKUs |
| P1.14 | Marked unavailable in the feed but removed from the PDP |
| P1.15 | Tax treatment declared but only at checkout, not in the feed |
| P1.16 | Shipping cost derivable for the primary market only |
| P1.17 | Media reachable, one or more wrong `Content-Type` |
| P1.18 | Restricted items flagged, but the restriction class is not machine-readable |
| P1.19 | Contradiction present between sources but on non-transactional fields only |
| P1.20 | `Last-Modified` semantics correct, no diff endpoint |
| P2.03 | Rejected, but as a generic bot block rather than a tag mismatch |
| P2.06 | Rejected, with no step-up route by which a legitimate new directory entrant can proceed |
| P2.09 | Binding enforced for some registered directories but not all |
| P2.11 | Rotation honoured within 72h rather than 24h |
| P2.12 | Agent traffic rate-limited separately, limits undocumented |
| P2.13 | Machine-readable reason on some rejection paths but not all |
| P2.14 | Deprecated algorithms rejected, allowlist undeclared |
| P2.16 | `Content-Digest` verified on some mutating methods but not all |
| P2.17 | Skew tolerance bounded but undeclared |
| P2.18 | Replay protection survives restart for part of the declared window |
| P2.20 | No downgrade, but non-browser TLS fingerprints are rate-limited more aggressively without declaring it |
| P2.21 | Agent identity reaches the order record but not the audit envelope |
| P2.22 | Per-identity limiting available but not the default |
| P2.23 | No challenge on declared endpoints, challenge present on an undeclared endpoint in the purchase path |
| P2.24 | Declared policy matches observed behaviour except on non-purchase endpoints |
| P2.25 | Honoured within the declared window for revocations but not suspensions |
| P2.26 | Step-up path machine-navigable but undocumented |
| P3.03 | Discount applies to the order total with no per-line allocation |
| P3.06 | Exactly one session wins, loser receives an untyped error |
| P3.08 | Errors typed but undocumented |
| P3.09 | Loyalty unsupported and declared, declaration not machine-readable |
| P3.10 | Guest checkout exists, order status retrieval requires an account |
| P3.11 | p95 between 1.5s and 3.0s, no human-only step |
| P3.12 | Expiry enforced but untyped on breach |
| P3.13 | Reservation semantics observed to match for holds but undeclared |
| P3.14 | Options and prices enumerable, no estimated dates |
| P3.15 | Errors typed but not field-level |
| P3.16 | Recalculated before payment but not surfaced as a change |
| P3.17 | Currency stable, market declaration absent |
| P3.18 | Limits enforced and typed, undeclared in advance |
| P3.19 | Mixed cart handled for some combinations, unsupported combinations untyped |
| P3.20 | Recurring items declared, mandate implications not |
| P3.21 | Hold released, no agent-visible confirmation |
| P3.23 | Transitions observable to fulfilment but not to delivery |
| P3.24 | Polling path works, no webhook, or webhooks without redelivery |
| P3.26 | Limits accommodate a normal cadence, undeclared |
| P4.07 | Agent identity populated, mandate reference absent |
| P4.08 | Step-up completes but at a threshold other than the declared one |
| P4.09 | Auth-to-capture window as declared, partial capture unsupported and undeclared |
| P4.13 | Decline reasons typed but generic, not actionable |
| P4.14 | Alternate rail declared, not exercisable in sandbox |
| P4.15 | Settlement report carries the agent reference but not the mandate reference |
| P4.17 | Currency mismatch declines, decline reason not typed to the cause |
| P4.18 | Item restriction honoured at category level, not at SKU level |
| P4.19 | Second presentation declines, with no reason typed to replay |
| P4.21 | Chain checked against a cached directory with no freshness bound |
| P4.23 | Fees disclosed before authorisation but not itemised |
| P4.24 | Rate disclosed at authorisation but not before |
| P4.25 | Partial refund supported, agent-visible state updated only after settlement |
| P4.26 | Original instrument used, fallback to credit undeclared |
| P4.27 | Void supported, not observable by the agent |
| P4.28 | Notification reaches a merchant channel, not an agent-accessible one |
| P4.29 | Bundle machine-readable, schema unversioned |
| P4.30 | Settlement timing declared, observed variance outside the declared window |
| P4.31 | Phantom order created and reconciled within the session, visible in between |
| P5.02 | Envelope machine-readable, proprietary schema with no published mapping |
| P5.03 | Pre-execution record written for some action classes but not all |
| P5.04 | Threshold declared, enforcement observed in the merchant UI but not on the agent path |
| P5.07 | Residency declared for order data but not for audit envelopes |
| P5.08 | Tamper-evident, not append-only |
| P5.09 | Retrievable by order ID only |
| P5.10 | Policy version recorded, not resolvable to the policy text |
| P5.11 | Rejections recorded without the evaluated policy |
| P5.12 | Timestamps timezone-explicit, clock source undeclared |
| P5.13 | Access logged for programmatic reads, not for console reads |
| P5.14 | Retention declared and enforced at the upper bound only |
| P5.15 | Requests handled, audit-obligation interaction undocumented |
| P5.16 | Path declared, no stated notification timeline |

### 3.4 Not applicable

A check is excluded from both numerator and denominator only when the merchant **declares**
it inapplicable and the probe **verifies** the declaration. An undeclared absence is a
failure, not an exclusion. Exclusion-eligible checks are marked `N/A?` in the tables:
P1.09, P1.16, P1.18, P1.20, P3.06, P3.09, P3.19, P3.20, P4.09, P4.14, P4.18, P4.24, P4.25.

Two limits stop a merchant scoring well by declaring most of a pillar away:

- **No Hard check is exclusion-eligible.** Every ceiling in §3.5 is always live.
- **A pillar with more than 30% of its weight excluded is capped at Silver**, and the
  exclusions are listed on the certificate as `scopeExclusions` so a reader sees what was
  not tested. 30% is a v1.0 calibration value recorded in the rubric source, not a
  derived constant.

Stated plainly, because a cap that cannot trigger is not a control: under v1.0 the
exclusion-eligible weight is 14.0% of P1, 12.2% of P3 and 9.8% of P4, and zero in P2 and
P5. **No merchant can reach the 30% cap under v1.0.** It is a forward guard on N/A
expansion in later rubric versions, and the headroom figures above are recomputed and
published with each release.

### 3.5 Tiers and ceilings

v1.0 as drafted said a P1/P3/P5 hard failure was "capped at Silver" while also defining
Silver as requiring zero hard failures, which made the cap unreachable. The resolution is
to compute the tier twice and take the **lower** of the two.

**Step 1 — score tier**, from the GreenLaneScore alone:

| Score | Score tier |
|---|---|
| ≥ 850 | Gold |
| ≥ 700 | Silver |
| ≥ 550 | Bronze |
| < 550 | Uncertified |

**Step 2 — ceiling**, from Hard failures, most severe winning:

| Condition | Ceiling |
|---|---|
| Any `Hard` check in P4 fails | **Uncertified** |
| Any `Hard` check in P2 fails | Bronze |
| Any `Hard` check in P1, P3 or P5 fails | Silver |
| More than 30% of any pillar's weight excluded (§3.4) | Silver |
| No Hard failure, no excess exclusion | Gold |

**Step 3 — the certificate tier is `min(score tier, ceiling)`** on the ordering
Uncertified < Bronze < Silver < Gold.

This closes both v1.0 contradictions. A P1 hard failure with a score of 910 yields Silver.
A P2 hard failure with a score of 480 yields `min(Uncertified, Bronze)` = Uncertified,
where v1.0 said both "capped at Bronze" and "uncertified below 550" and left the reader to
choose. The tier rows no longer restate "zero hard fails", because Step 2 owns that.

**What each tier asserts:**

| Tier | Meaning |
|---|---|
| **Gold** | Autonomous purchase safe, including unattended re-orders |
| **Silver** | Agent purchase safe with step-up on high value |
| **Bronze** | Agent-discoverable and transactable with human confirmation |
| **Uncertified** | Report issued, no credential |

### 3.6 Reason codes

Every failed or partial check maps to a stable code — `GL-P4-02-OVERCAP`,
`GL-P2-10-BLOCKED` — so a PSP or issuer can act on the signal without parsing prose. The
code is stable across rubric versions even if the check's weight changes; if a check is
retired its code is never reused. This is the format the risk-signal API returns, and the
`openFindings` array in the credential carries it.

---

## 4. Pillar detail

### 4.1 — P1 Discoverability (15%, 20 checks, Σ W = 57)

| ID | Check | Authority | Type | W |
|---|---|---|---|---|
| P1.01 | `/.well-known/ucp` manifest present, parses, declares services and capability JSON Schemas | UCP | Hard | 5 |
| P1.02 | Declared capabilities match live endpoint behaviour (no phantom capabilities) | UCP | Hard | 5 |
| P1.03 | ACP product feed reachable, schema-valid, refreshed < 24h | ACP | Scored | 3 |
| P1.04 | `schema.org/Product` + `Offer` on every PDP with `price`, `priceCurrency`, `availability`, `gtin`/`sku` | schema.org | Scored | 3 |
| P1.05 | Feed↔PDP parity: price, currency, availability, title, image for a 200-SKU sample | GreenLane | Hard | 5 |
| P1.06 | Variant model resolvable (size/colour → purchasable SKU) without JS execution | UCP | Scored | 3 |
| P1.07 | `robots.txt` / `llms.txt` state an explicit, non-contradictory agent policy | Web Bot Auth | Scored | 2 |
| P1.08 | Machine-readable returns, shipping, warranty and price-match policy at a stable URL | UCP | Scored | 2 |
| P1.09 | Catalogue localisation: currency, tax-inclusive pricing and shipping destinations declared per market `N/A?` | UCP | Scored | 2 |
| P1.10 | Manifest and feed served over HTTPS with a valid chain; no mixed-content references on sampled PDPs | TAP | Scored | 2 |
| P1.11 | Protocol version declared in the manifest and matching a version pinned as supported for the run | UCP | Scored | 3 |
| P1.12 | Full-catalogue traversal completes via declared pagination without tripping a rate limit | ACP | Scored | 3 |
| P1.13 | SKU and variant identifiers stable across feed refreshes (no churning IDs) | GreenLane | Scored | 3 |
| P1.14 | Out-of-stock SKUs marked unavailable rather than removed silently from the feed | GreenLane | Scored | 3 |
| P1.15 | Tax treatment (inclusive or exclusive) declared per market in the feed, not only at checkout | UCP | Scored | 2 |
| P1.16 | Shipping cost derivable before checkout for the declared destination set `N/A?` | UCP | Scored | 2 |
| P1.17 | Product media reachable with correct `Content-Type` for agent-side verification | schema.org | Scored | 2 |
| P1.18 | Restricted, age-gated or otherwise regulated items flagged machine-readably in the feed `N/A?` | Scheme rules | Scored | 2 |
| P1.19 | No contradiction on transactional fields between JSON-LD, microdata and the feed | schema.org | Scored | 3 |
| P1.20 | Catalogue diff endpoint, or correct `Last-Modified`/`ETag` semantics so agents need not re-crawl `N/A?` | ACP | Scored | 2 |

*Failure mode this catches:* the exact one that killed Instant Checkout — a store that
looks fine to a human while the agent-facing surface serves stale prices and
out-of-stock SKUs.

### 4.2 — P2 Agent Identity & Access (20%, 26 checks, Σ W = 89)

The **signature challenge matrix**. GreenLane sends the same purchase-intent request eight
ways and asserts the merchant's accept/reject behaviour. This is the single hardest thing
for a merchant to self-test and the fastest to regress. The matrix stays at eight rows;
identity checks beyond the matrix are numbered from P2.09.

| ID | Request variant | Expected origin behaviour | Authority | Type | W |
|---|---|---|---|---|---|
| P2.01 | Valid RFC 9421 signature, key in Visa TAP directory, `tag=agent-payer-auth` | Accept, no CAPTCHA, no rate-limit | TAP | Hard | 5 |
| P2.02 | Valid signature, key in Mastercard Agent Pay directory | Accept | Agent Pay | Hard | 5 |
| P2.03 | Valid signature, `tag=agent-browser-auth` on a checkout endpoint | Reject (wrong tag for purchase) | TAP | Scored | 3 |
| P2.04 | Expired `created`/`expires` window | Reject | RFC 9421 | Hard | 5 |
| P2.05 | Replayed `nonce` | Reject (replay protection present) | RFC 9421 | Hard | 5 |
| P2.06 | Signature valid, `keyid` not in any registered directory | Reject or step-up | Web Bot Auth | Scored | 3 |
| P2.07 | Tampered body, otherwise valid signature | Reject | RFC 9421 | Hard | 5 |
| P2.08 | Unsigned request with an agent-like User-Agent | Reject or step-up, **never** silently accept | Web Bot Auth | Hard | 5 |

| ID | Check | Authority | Type | W |
|---|---|---|---|---|
| P2.09 | `Signature-Agent` host is bound to the domain registered for the presented `keyid`; a mismatch is rejected | Web Bot Auth | Scored | 3 |
| P2.10 | Bot management does not block verified agents (no CAPTCHA/JS-challenge on the accept cases above) | TAP | Hard | 5 |
| P2.11 | Directory public keys fetched and cached correctly; key rotation honoured within 24h | Web Bot Auth | Scored | 3 |
| P2.12 | Agent traffic is rate-limited separately from human traffic, with documented limits | GreenLane | Scored | 2 |
| P2.13 | Rejections return a machine-readable reason, not a 403 HTML wall | Web Bot Auth | Scored | 2 |
| P2.14 | Signature algorithm allowlist enforced and declared; deprecated algorithms rejected | RFC 9421 | Scored | 2 |
| P2.15 | All required signature components covered — `@method`, `@target-uri`, `content-digest` | RFC 9421 | Hard | 5 |
| P2.16 | `Content-Digest` present and actually verified against the body on every mutating method | RFC 9421 | Scored | 3 |
| P2.17 | Clock-skew tolerance bounded and declared, so a correct agent is not rejected by drift | RFC 9421 | Scored | 2 |
| P2.18 | Replay protection survives process restart — the nonce store is not in-memory only | RFC 9421 | Scored | 3 |
| P2.19 | Directory key fetch **fails closed**: an unreachable directory does not admit unverified agents | Web Bot Auth | Hard | 5 |
| P2.20 | No TLS downgrade and no TLS-fingerprint-based blocking of non-browser clients | TAP | Scored | 2 |
| P2.21 | Agent identity propagated to the order record and the audit envelope, not discarded at the edge | MAS SAFR | Scored | 3 |
| P2.22 | Rate limiting available per agent identity, not only per IP | GreenLane | Scored | 2 |
| P2.23 | No CAPTCHA or JS challenge on any endpoint in the declared purchase path | GreenLane | Scored | 3 |
| P2.24 | Declared agent policy in `robots.txt`/`llms.txt` is consistent with observed accept/reject behaviour | Web Bot Auth | Scored | 3 |
| P2.25 | A revoked or suspended directory registration is honoured within the declared window | Agent Pay | Scored | 3 |
| P2.26 | Step-up route for an unknown agent is machine-navigable and documented, not a human-only page | Web Bot Auth | Scored | 2 |

*Failure mode this catches:* a merchant whose WAF quietly 403s every verified agent —
invisible on a human-run readability scan, and pure lost revenue. P2.19 catches its
opposite: a merchant who admits everything the moment the key directory is unreachable.

### 4.3 — P3 Machine Checkout (25%, 26 checks, Σ W = 82)

Driven end-to-end by a headless agent in the merchant's sandbox or test mode.

| ID | Check | Authority | Type | W |
|---|---|---|---|---|
| P3.01 | `POST /checkout-sessions` accepts a valid UCP/ACP payload and returns a session with totals | UCP | Hard | 5 |
| P3.02 | Totals are complete and correct: line items + tax + shipping + fees = charged amount, to the cent | UCP | Hard | 5 |
| P3.03 | Session mutation (`PUT`) applies discount codes with a per-line allocation breakdown | UCP | Scored | 2 |
| P3.04 | Multi-item cart supported (≥ 3 distinct SKUs, mixed variants) | GreenLane | Hard | 5 |
| P3.05 | **Idempotency**: identical `idempotency-key` replayed 3× yields one order, one charge | ACP | Hard | 5 |
| P3.06 | Concurrent sessions on the last unit of inventory: exactly one wins, the other gets a typed out-of-stock error `N/A?` | GreenLane | Scored | 3 |
| P3.07 | Price change between session creation and payment is surfaced, not silently absorbed | UCP | Hard | 5 |
| P3.08 | Typed, documented error taxonomy (not HTTP 500 with an HTML body) | UCP | Scored | 3 |
| P3.09 | Loyalty / member pricing resolvable by an agent, or explicitly declared unsupported `N/A?` | GreenLane | Scored | 2 |
| P3.10 | Guest checkout path exists (no forced account creation mid-flow) | GreenLane | Scored | 2 |
| P3.11 | p95 checkout-session latency < 1.5s; no step that requires human-only interaction | GreenLane | Scored | 2 |
| P3.12 | Session expiry declared and enforced; an expired session returns a typed error, not a generic failure | UCP | Scored | 2 |
| P3.13 | Inventory reservation semantics declared (hold or no hold) and observed to match the declaration | UCP | Scored | 3 |
| P3.14 | Shipping options enumerable by the agent with prices and estimated dates before payment | UCP | Scored | 3 |
| P3.15 | Address validation returns typed, field-level errors rather than one opaque rejection | UCP | Scored | 3 |
| P3.16 | Tax recalculated on address change and surfaced as a change before payment | UCP | Scored | 3 |
| P3.17 | Session currency matches the declared market and does not switch mid-flow | UCP | Scored | 2 |
| P3.18 | Quantity and per-order caps declared in advance, enforced, and typed on breach | GreenLane | Scored | 2 |
| P3.19 | Mixed digital/physical cart handled, or the unsupported combinations typed and declared `N/A?` | UCP | Scored | 2 |
| P3.20 | Subscription or recurring line items declared, with their mandate implications stated `N/A?` | AP2 | Scored | 3 |
| P3.21 | Cancelling an unpaid session releases any inventory hold, observably to the agent | UCP | Scored | 2 |
| P3.22 | Order confirmation retrievable by the agent under a stable order identifier | UCP | Hard | 5 |
| P3.23 | Order status transitions observable by the agent through fulfilment, shipment and delivery | UCP | Scored | 3 |
| P3.24 | Webhook or polling path for order events documented and working, with redelivery on webhook failure | UCP | Scored | 3 |
| P3.25 | Checkout completes without a browser-only SDK or a human-only device fingerprint | GreenLane | Hard | 5 |
| P3.26 | Session-creation rate limits accommodate a normal agent cadence and are declared | GreenLane | Scored | 2 |

*Failure mode this catches:* a checkout that works for a human with a mouse and a browser
fingerprint, and silently degrades or dead-ends for everything else. P3.22 and P3.25 are
Hard because an agent that cannot retrieve its own order, or cannot get through without a
browser SDK, has no transaction at all.

### 4.4 — P4 Money Integrity (30%, 32 checks, Σ W = 112)

Run against PSP sandbox credentials with network test cards and test-mode agentic tokens.
**GreenLane never touches live cardholder data and never moves real money.**

| ID | Check | Authority | Type | W |
|---|---|---|---|---|
| P4.01 | Delegated / agentic token (Agent Pay, ACP shared payment token) accepted end-to-end to authorisation | Agent Pay | Hard | 5 |
| P4.02 | **Mandate scope — over-cap**: amount above the token's per-transaction spend cap must decline | Agent Pay | Hard | 5 |
| P4.03 | **Mandate scope — wrong MCC/merchant**: out-of-scope token must decline | Agent Pay | Hard | 5 |
| P4.04 | **Mandate scope — expired window**: must decline | Agent Pay | Hard | 5 |
| P4.05 | Revoked token declines on next authorisation (revocation propagates) | Agent Pay | Hard | 5 |
| P4.06 | Verifiable Intent / mandate credential is verified before capture and the result is stored | Verifiable Intent | Hard | 5 |
| P4.07 | Agent-initiated indicators are populated correctly in the authorisation message | Scheme rules | Scored | 3 |
| P4.08 | Step-up (passkey / 3DS) triggers at the declared threshold and completes | Scheme rules | Scored | 3 |
| P4.09 | Auth-to-capture window and partial capture behave as declared `N/A?` | Scheme rules | Scored | 2 |
| P4.10 | **Double-charge probe**: network timeout after auth, then retry — no duplicate charge | Scheme rules | Hard | 5 |
| P4.11 | Refund via API completes and is reflected in the agent-visible order state | ACP | Hard | 5 |
| P4.12 | Dispute evidence bundle retrievable for an agent order: mandate, intent credential, agent identity, item snapshot, delivery proof | Scheme rules | Hard | 5 |
| P4.13 | Decline reasons returned to the agent are actionable and typed | Scheme rules | Scored | 2 |
| P4.14 | Alternate rail declared where relevant (PayNow request-to-pay with structured reference, or x402/stablecoin) `N/A?` | GreenLane | Scored | 2 |
| P4.15 | Reconciliation: settlement report carries the agent and mandate reference | Scheme rules | Scored | 3 |
| P4.16 | **Mandate scope — cumulative cap**: a transaction breaching the token's cumulative (not per-transaction) cap must decline | Agent Pay | Hard | 5 |
| P4.17 | **Mandate scope — currency mismatch**: a currency outside the mandate's scope must decline | Agent Pay | Scored | 3 |
| P4.18 | **Mandate scope — item or category restriction** honoured where the mandate declares one `N/A?` | AP2 | Scored | 3 |
| P4.19 | A mandate presented twice for two authorisations declines the second | AP2 | Scored | 3 |
| P4.20 | Mandate credential signature is **verified, not merely parsed** — a tampered mandate declines | Verifiable Intent | Hard | 5 |
| P4.21 | Mandate issuer's trust chain checked against a directory, with a freshness bound | Verifiable Intent | Scored | 3 |
| P4.22 | Authorised amount equals the amount the agent was shown — no post-hoc uplift | Scheme rules | Hard | 5 |
| P4.23 | Tip, surcharge or convenience fee disclosed and itemised before authorisation | Scheme rules | Scored | 2 |
| P4.24 | Currency conversion, where applied, disclosed with its rate before authorisation `N/A?` | Scheme rules | Scored | 2 |
| P4.25 | Partial refund supported and reflected in agent-visible state `N/A?` | ACP | Scored | 2 |
| P4.26 | Refund routes to the original instrument, not store credit, unless declared otherwise | Scheme rules | Scored | 2 |
| P4.27 | Void before capture supported and observable by the agent | Scheme rules | Scored | 2 |
| P4.28 | Dispute and chargeback notification reaches an agent-accessible channel | Scheme rules | Scored | 2 |
| P4.29 | Evidence bundle is machine-readable against a versioned schema, not a PDF dump | Scheme rules | Scored | 3 |
| P4.30 | Settlement timing declared and matching observed sandbox behaviour | Scheme rules | Scored | 2 |
| P4.31 | A failed authorisation leaves no phantom order in agent-visible state | GreenLane | Scored | 3 |
| P4.32 | Test-mode and live-mode paths separated so a test credential cannot reach live state | PCI DSS | Hard | 5 |

*Failure mode this catches:* a merchant whose integration "works" on the happy path but
accepts an over-cap token — which is a chargeback the merchant will lose and a liability
position the network assumed was covered. P4.20 and P4.22 are the two that turn a mandate
from a document into a control: a mandate nobody verifies, or an amount that moves after
the agent agreed to it, makes every other money check decorative.

### 4.5 — P5 Governance & Audit (10%, 16 checks, Σ W = 49)

| ID | Check | Authority | Type | W |
|---|---|---|---|---|
| P5.01 | Per-transaction audit envelope: agent ID, mandate ID, policy evaluated, decision, timestamp | MAS SAFR | Hard | 5 |
| P5.02 | Envelope shape is interoperable and machine-comparable across agents | MAS SAFR | Scored | 3 |
| P5.03 | Pre-execution policy check recorded before the action, not reconstructed after | MAS SAFR | Scored | 3 |
| P5.04 | Human-in-the-loop threshold declared and enforced for high-value orders | MAS SAFR | Scored | 3 |
| P5.05 | Consent artifacts retained for the dispute window; retrievable by order ID | Scheme rules | Hard | 5 |
| P5.06 | Personal data in agent flows handled per PDPA: purpose stated, retention bounded, no PII in feeds | PDPA | Hard | 5 |
| P5.07 | Data residency of agent-flow records declared | PDPA | Scored | 2 |
| P5.08 | Audit records append-only, or tamper-evident with a verifiable integrity mechanism | MAS SAFR | Scored | 3 |
| P5.09 | Envelope retrievable by agent identity as well as by order ID | MAS SAFR | Scored | 2 |
| P5.10 | Policy version recorded alongside each decision and resolvable to the policy text | MAS SAFR | Scored | 3 |
| P5.11 | Decisions recorded for rejections and declines, not only for approvals | MAS SAFR | Scored | 3 |
| P5.12 | Clock source declared; timestamps monotonic and timezone-explicit | MAS SAFR | Scored | 2 |
| P5.13 | Access to audit records is itself logged, for both programmatic and console reads | MAS SAFR | Scored | 2 |
| P5.14 | Retention period declared and enforced at both bounds — records neither deleted early nor kept past purpose | PDPA | Scored | 3 |
| P5.15 | Access and deletion requests handled without breaking the audit-retention obligation, with the interaction documented | PDPA | Scored | 3 |
| P5.16 | Incident and breach notification path declared for agent-flow data, with a stated timeline | PDPA | Scored | 2 |

*Failure mode this catches:* a merchant who can show what the agent did but not what it
was permitted to do, five months later, to someone deciding a chargeback. P5.11 is the
quiet one: a system that logs only approvals cannot demonstrate that its controls ever
fired.

---

## 5. The credential

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
    "scoreTier": "gold",
    "ceiling": "gold",
    "pillars": { "P1": 902, "P2": 870, "P3": 915, "P4": 861, "P5": 840 },
    "protocols": ["ucp/2026-01", "acp/2026-04-17", "ap2/0.9", "tap/1.0"],
    "integrationFingerprint": "sha256:7c41…",
    "scopeExclusions": ["P4.14"],
    "openFindings": [],
    "evidenceDigest": "sha256:9f2b…",
    "lastVerified": "2026-08-29T02:11:04Z"
  }
}
```

Properties that matter:

- **The tier is shown with its derivation.** `scoreTier` and `ceiling` are both published
  alongside `tier`, because a reader who sees Silver deserves to know whether that is a
  scoring outcome or a Hard-check ceiling (§3.5). They are different risks.
- **`scopeExclusions` lists what was declared inapplicable** (§3.4). A credential that
  hides its exclusions overstates its coverage.
- **`integrationFingerprint` binds the credential to the integration, not just the
  domain.** See TRUST-MODEL §5 — a deploy can change agentic behaviour without changing
  the domain, which is the one way this differs structurally from a TLS certificate.
- **Short-lived (90 days) and continuously re-verified.** Weekly re-runs; a regression
  revokes via status list within minutes, not at the next annual audit.
- **Verifiable offline** against published JWKS, and online for revocation state.
- **Served two ways**: merchant publishes it at `/.well-known/greenlane-pass.json`, and
  the GreenLane registry answers `GET /v1/pass?domain=` for agents and issuers.
- **Scoped, not a warranty.** The credential asserts observed behaviour of a named domain
  under rubric v1.0 at a timestamp. It is assurance, not indemnity — and the wording says so.

---

## 6. Rubric governance

- Spec repos (UCP, ACP, AP2, TAP, Web Bot Auth) are watched by CI. A published spec diff
  opens a rubric-change PR automatically with the affected check IDs listed.
- Rubric changes ship on a 60-day notice: announced, then advisory for one cycle, then
  scored. Merchants are never surprise-downgraded by a rubric release.
- **Weight changes are rubric changes.** Re-weighting a check moves every score that
  depends on it, so it takes the same 60-day notice as adding one. Reason codes survive
  re-weighting unchanged (§3.6).
- A published appeals path: a merchant can contest any finding, and the stored evidence
  artifact is what settles it. Because §3 is fully specified, an appeal can be settled by
  recomputing the score from the evidence rather than by re-running the probe.
- The rubric text is public, and so is the weight table — a score nobody outside GreenLane
  can recompute would not survive its first contested finding. The corpus of failure data
  behind the *calibration* of those weights is not public.
- Calibration values that are chosen rather than derived are recorded as such in the
  rubric source: the four-point weight scale, the 30% exclusion cap (§3.4), the tier
  thresholds (§3.5), and the 200-SKU parity sample (P1.05).
