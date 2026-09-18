# GreenLane — Trust Model

[`CERTIFICATION-SPEC.md`](./CERTIFICATION-SPEC.md) says what is tested and how it scores.
This document answers the prior question: **why would anyone believe the certificate?**

GreenLane's founding analogy is the TLS certificate — a third party checks something, issues
a signed artifact, and revokes it when the facts change. The analogy is load-bearing, so it
is worth taking seriously rather than gesturing at. Taken seriously, it produces three
problems that the rubric and the architecture do not currently solve, and one structural
difference from TLS that changes the product.

**Scope note.** A companion artifact, *GreenLane Liability Chain*
(`https://claude.ai/artifact/YAhYw7SojixrtNi8JfVYgm`), covers the liability layer — what
the certificate actually claims, evidence grades, and who is answerable when a certified
merchant fails. This document is deliberately the other half: the **mechanics** of trust,
being establishment, scoping, validation integrity and revocation. Where the two touch,
that artifact governs the liability reading and this document governs the mechanism. It
was unreadable at the time of writing (the artifact service returned 503), so the split
above is asserted from its summary rather than from its text, and the two should be
reconciled before either is treated as settled.

---

## 1. What transfers from the WebPKI, and what does not

| TLS / WebPKI | GreenLane | Status |
|---|---|---|
| Certificate Authority | GreenLane as certifier | Built |
| Certificate | W3C VC 2.0, Ed25519, `did:web` | Built (SPEC §5) |
| Key ceremony, HSM-held issuing key | KMS FIPS 140-2 L3 | Built (ARCHITECTURE §3) |
| Domain Validation | DNS TXT domain-ownership proof | Built (ARCHITECTURE §8) |
| DV / OV / EV assurance levels | Bronze / Silver / Gold tiers | Built (SPEC §3.5) |
| CA/Browser Forum Baseline Requirements | The published rubric | Built (SPEC) |
| CRL and OCSP | StatusList2021 + registry endpoint | Built (SPEC §5) |
| OCSP stapling | Merchant-hosted `/.well-known/greenlane-pass.json` | Built (SPEC §5) |
| Short-lived certificates | 90-day life, weekly re-verification | Built (SPEC §5) |
| **Root programs** (who decides a CA is trusted) | **Nothing. No equivalent exists.** | §2 |
| **Multi-perspective validation** (anti-hijack) | **Nothing — and the architecture works against it** | §3 |
| **Certificate Transparency logs** | **Nothing** | §4 |
| **WebTrust / ETSI audit of the CA itself** | Roadmap SOC 2 only, which is not the same thing | §4 |
| **Misissuance disclosure policy** | **Nothing** | §4 |
| Name constraints, wildcards, SAN lists | Scoping rules | §5 |
| Certificate binds a key to a **name** | Certificate binds behaviour to a name — and behaviour changes without the name changing | §5, the structural difference |
| Intermediate CAs | Delegated issuance for the PSP portfolio product | §6 |

The top half of that table is the part already designed, and it is the easier part. The
gaps are what this document is for.

---

## 2. The missing root — the problem that decides the business

**A CA does not decide that it is trusted.** Chrome, Mozilla, Apple and Microsoft decide,
through root programs that publish admission requirements and enforce them by removal. A CA
with a perfect key ceremony and no root-program membership issues certificates that are
cryptographically valid and commercially worthless. Trust in the WebPKI is delegated by a
handful of chokepoints, and the chokepoints existed before most of the CAs did.

GreenLane inherits the structure without the chokepoints. The candidate root programs are
visible enough to name:

| Candidate root | Why it qualifies | What it would take |
|---|---|---|
| Agent platforms | They decide which merchants their agents will transact with | A merchant-readiness signal in their routing or allowlist |
| Card networks | They already operate key directories and admit merchants to agentic programmes | Recognition of the credential in programme registration |
| Commerce platforms | They gate what their merchants can enable | App-store surfacing, or a platform-level conformance requirement |

None of them runs such a programme today, because the category does not exist yet. That is
the honest statement of `BUSINESS-CASE.md` §4.5 risk 3 — "the credential never gets
consumed" — expressed structurally: **GreenLane is a CA in a world with no root store.**

Three strategies, and they are not equivalent:

1. **Be the CA and wait for a root program to form.** What the current plan implies.
   The risk is total and outside GreenLane's control.
2. **Be the standard and the assessor, not the certifier.** Publish the rubric as the
   baseline requirements, and let a network or platform be the root while GreenLane is the
   accredited assessor against it. This is the **WebTrust position rather than the CA
   position**, and in the WebPKI it is the more durable one: audit firms outlast individual
   CAs. Revenue changes shape, from per-certificate to assessment and accreditation.
3. **Both, sequenced.** Operate as the certifier to prove the rubric works and to build the
   failure corpus, while campaigning for the rubric itself to become a root program's
   admission criterion. When that happens, being the incumbent reference implementation is
   the moat.

**Recommendation: (3).** It also reframes a decision already taken. `BUSINESS-CASE.md`
mitigates "standards bodies absorb the rubric" by publishing openly and being the reference
implementation, which reads like making the best of a loss. Under the root-program analogy
it is the strategy: **the rubric being public is not generosity, it is the bid to become
someone's baseline requirements.** Absorption is the win condition, provided GreenLane is
the assessor when it happens.

One asymmetry to plan around: in the WebPKI the root programs preceded the CAs. Here the
certifier precedes the root program, so GreenLane must be fundable on merchant-side ROI
alone for as long as that inversion lasts. That is what `BUSINESS-CASE.md` already
concludes, and the trust model corroborates it rather than arguing with it.

---

## 3. Validation integrity — and one thing the architecture gets backwards

In the WebPKI, the attack on domain validation is not forging a signature, it is making the
CA see a lie: BGP and DNS hijacks that put the attacker in the validation path. The answer
the CA/Browser Forum arrived at is **multi-perspective validation** — corroborating the
check from several network vantage points and refusing to issue on divergence. *(The ballot
history and phase-in dates need checking against the Forum's published record before this is
cited externally.)*

GreenLane has the same exposure in a sharper form, and `ARCHITECTURE.md` §4.1 currently
makes it worse. Probe egress runs through **a published, static EIP pool** so merchants can
allowlist the prober and so the traffic is attributable. Both reasons are good. The
consequence is that the single most valuable thing to a dishonest merchant is handed over
for free: **a reliable way to tell the certifier apart from a real agent.** Allowlist those
IPs, serve them correct behaviour, and serve everyone else whatever is cheapest. Every check
in the rubric passes and none of it is true.

This is not hypothetical bad faith. The benign version is more likely and equally damaging:
a WAF rule written to let GreenLane through, which quietly becomes the reason the merchant
never notices that verified agents are still being blocked.

**The fix is the WebPKI's fix, adapted.** Keep the published pool for the main run, and add
a second vantage point the merchant cannot identify:

- The **attributable run** executes from the published EIPs, as now. Merchants allowlist it,
  and GreenLane remains a well-behaved, identifiable bot.
- A **corroborating run** re-executes a sampled subset of checks from unpublished, rotating
  egress, signed with the same registered key so it is still a legitimate verified agent and
  still honours the rate ceiling. It is not a stealth crawl; it is the same agent arriving by
  a different road.
- **Divergence between the two is itself the finding**, and a severe one. A merchant whose
  behaviour depends on the prober's IP address rather than on the prober's signature has
  demonstrated exactly the defect certification exists to detect.

Proposed as **P2.27 — "Observed behaviour does not depend on the origin network of a
verified agent"**, Hard, W 5, authority `GreenLane`, reason code
`GL-P2-27-DIVERGENCE`. It is proposed for **v1.1, not slipped into v1.0**: SPEC §6 requires
60 days' notice and one advisory cycle for a new scored check, and a rule the certifier
exempts itself from is not a rule. Which checks belong in the corroborating subset is an
engineering decision — the identity and money-leg checks are the obvious candidates, and
sampling cost is why it is a subset.

---

## 4. Auditing the auditor

Two mechanisms make the WebPKI survivable when a CA is wrong, and GreenLane has neither.

**Certificate Transparency.** Every issuance goes into append-only public logs, so third
parties can detect misissuance the CA has not disclosed. The GreenLane equivalent is cheap
and should ship with the first certificate: an **append-only public log of every issuance,
re-verification and revocation** — domain, rubric version, score, tier, evidence digest,
timestamp. Not the evidence, which is commercially confidential (SPEC §6), only the fact and
the digest. This is what lets a network audit GreenLane's issuance history without trusting
GreenLane's word for it, and it is a precondition for any root program admitting it.

**Audit of the certifier.** `ARCHITECTURE.md` has SOC 2 Type II on the roadmap. SOC 2
attests that GreenLane operates its controls as described; WebTrust for CAs attests that a
CA **followed its stated issuance practices**. Those are different claims, and only the
second is the one a consumer of the credential needs. What goes with it, and what the
WebPKI learned to require, is a **Certification Practice Statement**: a published document
stating what GreenLane will and will not certify, the evidence standard for each claim, the
appeals path, the revocation triggers and timelines, and the misissuance disclosure policy.
The Liability Chain artifact reportedly reaches the same recommendation from the liability
side; the mechanism side reaches it because without a CPS there is nothing for an audit to
be an audit *of*.

**Misissuance.** No policy exists today for the case where GreenLane certifies a merchant
that then fails in the field. The WebPKI's answer is a published disclosure timeline,
mandatory revocation windows and a public incident report. The minimum here: a stated
window for revoking on discovery, a public incident entry in the transparency log, and a
rubric-change PR when the root cause is a missing check. The appeals path in SPEC §6 handles
the merchant disputing GreenLane; none of it handles GreenLane being wrong in the
merchant's favour, which is the failure that costs a root program its confidence.

---

## 5. What the certificate binds — the one real structural difference

A TLS certificate binds a public key to a name, and the binding stays true until the key or
the name changes. **A GreenLane certificate binds observed behaviour to a name, and
behaviour changes without the name changing.** A Friday deploy, a WAF rule, a PSP
configuration change or a theme update can invalidate every P2 and P3 result while the
domain, the key and the certificate all remain perfectly valid.

This is why the 90-day life and the CI gate are not merely conveniences. In TLS, short
lifetimes hedge against key compromise; here they hedge against the subject silently
becoming a different subject. That is a weaker guarantee, and the honest way to close the
gap is to bind the certificate to the integration as well as the name.

**Integration fingerprint.** A digest over the things whose change plausibly changes agentic
behaviour: declared protocol versions, the set of declared endpoints, the manifest hash, the
PSP identifier, the observed edge/WAF vendor, and the TLS configuration. It is published in
the credential (SPEC §5) so any consumer can compare it to what it observes.

That produces a third credential state, which the spec does not currently have:

| State | Means | Trigger |
|---|---|---|
| **Valid** | Behaviour observed and within its window | Successful run |
| **Stale** | The integration changed; the last result no longer describes what is deployed | Fingerprint mismatch |
| **Revoked** | Behaviour regressed against the rubric | Failed re-verification |

Staleness is not revocation and must not be published as one — the merchant has done nothing
wrong by deploying. It is a request for re-verification, and it is the honest state for a
credential whose subject just changed underneath it. An agent reading a stale pass should
treat it as a lower tier rather than as an absence.

**Scoping rules.** Agentic behaviour is per-origin, because the WAF rule, the checkout
endpoint and the PSP configuration are per-origin. So:

- **One credential covers one origin and one declared market set.** No wildcards. A
  wildcard readiness certificate would assert something no run observed.
- **Subdomains are separate subjects.** `checkout.example.sg` is not certified by a
  certificate for `www.example.sg`.
- The genuinely common case — one merchant, forty country storefronts on one platform
  template — is not solved by wildcards but by delegated issuance (§6), where the shared
  thing being certified is the template.

---

## 6. Delegated issuance — the intermediate-CA analogue

The PSP portfolio product in `ARCHITECTURE.md` §7 is, structurally, an intermediate CA: a
partner enrolling merchants under GreenLane's root. The WebPKI's experience of delegating
issuance is mostly cautionary — the ecosystem's worst incidents came from intermediates
whose issuance practices were weaker than the root's. What made it workable was **name
constraints**, technically enforced rather than promised.

If GreenLane delegates, the constraints should be in the credential, not in the contract:

- A delegate may issue only for domains whose ownership it has verified by the same
  mechanism, and only within a declared namespace.
- A delegate may not issue above a stated tier without a GreenLane-run money leg, because
  L3 is the part that requires the sandbox and the contract, and a Gold certificate that
  never had its money leg tested is the misissuance that ends the root program.
- Every delegated issuance lands in the same transparency log (§4).
- The root retains unilateral revocation, of both certificates and delegates.

Until those are enforceable, the portfolio product should sell scheduled runs and bulk
enrolment — which is what it already promises — and not delegated issuance.

---

## 7. What to settle before the first certificate

Ordered by how much depends on them:

1. **Which of the three §2 strategies is the plan.** It decides whether GreenLane pitches
   networks as a customer or as an accreditor, and the pitch is not the same pitch.
2. **Whether the corroborating run ships in v1.1** (§3), and which checks it samples. Until
   it does, every certificate carries an unstated assumption that the merchant is not
   special-casing the prober.
3. **The Certification Practice Statement** (§4), which is also where the liability wording
   and the evidence standard live. Reconcile with the Liability Chain artifact.
4. **The transparency log** (§4) — cheap, and hard to retrofit credibly once there is an
   issuance history that predates it.
5. **The integration fingerprint's inputs** (§5), which determine how often a credential
   goes stale. Too broad and every deploy triggers re-verification; too narrow and it misses
   the WAF change that matters.
