# GreenLane — Technical Architecture

Rubric v1.0 · Platform target: production pilot in Singapore, 500 certified domains,
20k scans/month, one PSP partner integrated.

---

## 1. What the system actually has to do

Certification is not a crawl. One certification run is a **long-lived, stateful,
partially-privileged, multi-protocol transaction saga** that:

- runs for 4–40 minutes across dozens of network round trips,
- holds merchant-delegated sandbox credentials for part of that time,
- must survive worker eviction and resume without re-charging a sandbox card,
- pauses for human input (merchant approves a destructive probe) and resumes,
- produces immutable evidence for every assertion, retained for the dispute window,
- and must be replayable months later when a finding is contested.

That shape — not the page count — is what drives every architectural choice below.

---

## 2. System context

```
┌──────────────┐    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Merchant    │    │  PSP /       │   │  Agent       │   │  Network /   │
│  (dashboard, │    │  Acquirer    │   │  platforms   │   │  Issuer      │
│  CI, Shopify)│    │  (portfolio) │   │  (registry)  │   │  (risk API)  │
└──────┬───────┘    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                   │                  │                  │
       ▼                   ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        GreenLane Control Plane                        │
│   Web app · Public API · Registry · Credential issuer · Billing       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  Temporal workflows
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐      ┌────────────────────────────┐
│      Probe Plane          │      │      Scoring Plane         │
│  L0 passive  L1 protocol  │─────▶│  rubric engine (rules)     │
│  L2 journey  L3 money leg │      │  LLM adjudicator (advisory)│
│  L4 governance            │      │  evidence sealer           │
└─────────────┬─────────────┘      └────────────┬───────────────┘
              │                                 │
              ▼                                 ▼
    Merchant storefront,              Postgres · S3 (WORM) ·
    sandbox APIs, PSP test env        ClickHouse · registry CDN
```

Three planes, separately deployable and separately blast-radiused. The probe plane is the
only thing that talks to merchant infrastructure, and it holds no long-lived secrets.

---

## 3. Tech stack

| Layer | Choice | Why this and not the obvious alternative |
|---|---|---|
| **Web app** | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Recharts | Server components keep the evidence-heavy report pages fast; one language with the API means protocol types are shared, not re-declared |
| **Control-plane API** | TypeScript, Hono on Node 22, OpenAPI-first, Zod contracts | The protocols we certify (UCP, ACP, AP2) publish JSON Schema; Zod round-trips it, so the rubric's schema checks and our own request validation come from one source |
| **Workflow engine** | **Temporal** (self-hosted on EKS, or Temporal Cloud ap-southeast-1) | The core decision. A run is a saga with compensations (release sandbox holds), retries with side-effect safety (never re-charge on replay), timers, human-in-the-loop signals, and full replayable history. Rebuilding this on SQS + a state column is where scanner startups die |
| **Probe workers** | TypeScript, Playwright (Chromium), `undici` for raw HTTP, `@noble/ed25519` for RFC 9421 signing | Playwright is TS-native; raw `undici` lets us craft malformed/expired/replayed signatures byte-exactly, which a browser stack cannot |
| **Agent runtime** | Claude (Opus 5 for adjudication, Sonnet 5 for journey steps) via the Anthropic API, tool-use loop, MCP client | The L2 journey needs a model that can recover from a novel checkout UI; MCP client lets us drive merchants who expose an MCP server natively |
| **Rubric engine** | Rules-as-code: YAML rubric → compiled TypeScript predicates, content-addressed by version | Deterministic, diffable, unit-testable, and a merchant can read the rule that failed them |
| **Analytics / ML** | Python 3.12, DuckDB + scikit-learn, batch on ECS | Only for calibration and remediation-ROI ranking — never in the certification path |
| **Primary datastore** | Postgres 16 (Aurora Serverless v2, ap-southeast-1), row-level security per tenant | Multi-tenant isolation enforced in the database, not in application `WHERE` clauses |
| **Evidence store** | S3 with Object Lock (compliance mode), 7-year retention, SSE-KMS | Evidence must be immutable to be worth anything in an appeal |
| **Telemetry warehouse** | ClickHouse Cloud | Cross-merchant benchmarks ("you are p31 for P4 among SG fashion") on 10^8 check results |
| **Cache / locks** | Redis (ElastiCache) | Directory key caching, per-domain concurrency locks |
| **Edge** | Cloudflare — WAF, Workers for badge + registry reads, R2 mirror | Registry lookups are latency-critical (an agent may check the pass mid-checkout); Workers serve them from cache at the edge |
| **Credentials** | W3C VC 2.0, Ed25519, `did:web`, StatusList2021; signing keys in AWS KMS (FIPS 140-2 L3 HSM) | Revocation must be near-instant; the issuer key must never exist in application memory |
| **IaC / CI** | Terraform, GitHub Actions with OIDC (no static cloud creds), ECS blue/green | — |
| **Observability** | OpenTelemetry → Grafana Cloud; Sentry; per-check pass-rate dashboards | A check whose pass rate jumps overnight is either a spec change or our bug — both need paging |

**Cloud:** AWS `ap-southeast-1` (Singapore) as the sole data region. Not a preference —
merchant order data and agent audit envelopes touched during probing stay in-region for
PDPA, and a Singapore-resident control plane is a precondition for selling to
MAS-regulated FIs.

---

## 4. The probe plane

### 4.1 Isolation model

Every run gets an **ephemeral, single-use ECS Fargate task**:

- fresh container, destroyed at run end, no reuse across tenants;
- egress only through a dedicated NAT gateway with a **published, static EIP pool**, so
  merchants can allowlist us — and so our traffic is attributable;
- no IAM role beyond "write to this run's evidence prefix"; merchant sandbox credentials
  are injected as a short-lived, single-run scoped token from Secrets Manager and never
  written to disk;
- outbound domain allowlist per run: the merchant's domains, their declared PSP sandbox
  hosts, and the network key directories. A compromised probe cannot pivot.

GreenLane **dogfoods the standard it certifies**: every probe request is signed with
RFC 9421 HTTP Message Signatures, our public key is published in a `/.well-known`
directory, and our `Signature-Agent` identity is registered. We are a well-behaved bot by
construction, which is also how we test P2.

### 4.2 The five probe layers

| Layer | Runs | Privilege | Duration |
|---|---|---|---|
| **L0 Passive** | Public surface: DNS, TLS, `robots.txt`, `llms.txt`, `/.well-known/ucp`, feeds, sitemap, schema.org on a sampled PDP set | None. Respects `robots.txt`. Available free, no consent needed | ~30s |
| **L1 Protocol conformance** | Schema validation against pinned UCP/ACP/AP2 versions; capability negotiation; the 8-way signature challenge matrix; error taxonomy | Requires **verified domain ownership** (DNS TXT) — it is an active probe | ~2 min |
| **L2 Agent journey** | Claude-driven Playwright/MCP agent: discovery → PDP → cart → checkout session → totals parity across feed/PDP/session | Merchant contract + sandbox or test-mode flag | 5–15 min |
| **L3 Money leg** | Test-mode authorisation with delegated/agentic tokens; mandate-scope negative tests; idempotency and double-charge probes; refund; dispute-evidence retrieval | Merchant contract + PSP sandbox credentials, explicit written scope | 10–25 min |
| **L4 Governance** | Audit-envelope shape vs MAS SAFR; consent retention; PDPA handling; residency attestation | Merchant-supplied API or attestation with sampled verification | ~3 min |

L0 is the free product and the entire top of funnel. L3 is the paid product and the moat:
it needs a contract, a sandbox and a PSP relationship, which is exactly why free scanners
stop at L0/L1.

### 4.3 Safety rails on the money leg

The rules that keep this from being the thing that gets us sued:

1. **Test mode only.** Sandbox PSP keys, network test cards, test-mode agentic tokens. A
   run aborts immediately if any credential resolves to a live-mode key — checked before
   the first request, and again on every authorisation response.
2. **Never touch a PAN.** GreenLane holds no cardholder data. Payment instruments are
   PSP-issued sandbox handles. This keeps us out of PCI DSS cardholder-data scope and out
   of the merchant's procurement hell; we are assessed as a SAQ-D-free service provider.
3. **Compensating actions are mandatory.** Every authorisation has a paired void/refund
   activity in the workflow. Temporal guarantees it runs even if the worker dies.
4. **Destructive probes are opt-in and gated.** Concurrency-on-last-unit (P3.06) and the
   double-charge probe (P4.10) require an explicit signal from the merchant in the run;
   the workflow blocks on it rather than assuming consent.
5. **Rate ceiling per domain**, honoured across concurrent runs via a Redis lease. We do
   not become the load test nobody asked for.

---

## 5. The scoring plane

```
raw results ──▶ [rubric engine] ──▶ deterministic verdicts ──┐
                                                             ├─▶ score + reason codes
evidence  ────▶ [LLM adjudicator] ─▶ advisory findings ──────┘        │
                       │                                             ▼
                       └────────▶ remediation plan            [evidence sealer]
                                                              hash → Merkle root
                                                              → S3 Object Lock
                                                              → digest in credential
```

**Deterministic first.** The rubric engine is pure functions over recorded evidence: same
evidence in, same score out, forever. Re-scoring an old run under a new rubric version is
a replay, not a re-scan — which is how appeals and rubric migrations are handled cheaply.

**Where the LLM is allowed to act:**

| Use | Model role | Can it affect the score? |
|---|---|---|
| L2 journey navigation | Agent with Playwright tools | Indirectly — but its *actions* are recorded and the assertions on them are deterministic |
| Semantic policy reading (returns terms, warranty clarity) | Judge with rubric + required citation | Advisory only, weight 0 in v1.0 |
| Failure explanation and remediation drafting | Generator | No |
| Triage of novel checkout patterns for rubric authors | Analyst | No — it proposes rubric changes to humans |

**LLM quality control**, because "the model graded it" is not an answer a bank accepts:
a golden corpus of 250 storefronts with human-labelled outcomes; every rubric or prompt
change runs the corpus and must not regress; per-check model-vs-deterministic agreement
is tracked, and a check whose agreement drops below threshold is demoted to advisory
automatically.

**Remediation output** is the recurring-revenue surface: for Shopify and WooCommerce the
fix ships as a config change or app setting; for custom stacks GreenLane opens a pull
request through a GitHub App, with the failing check ID, the evidence link, the patch, and
a test that reproduces the original failure.

---

## 6. Data model (core)

```
tenant ──< domain ──< run ──< check_result ──< evidence_artifact (S3 key + sha256)
                       │
                       ├──< score_snapshot (rubric_version, pillar scores, tier)
                       └──< credential (VC jwt, status_list_index, valid_from/until)

rubric_version ──< check_definition (id, pillar, weight, hard, authority_ref)
agent_directory_key (network, keyid, jwk, fetched_at)      # cached TAP / Agent Pay keys
portfolio_link (psp_tenant, merchant_domain, consent_scope) # PSP portfolio product
```

Retention: evidence 7 years (dispute + audit window), raw HAR bodies redacted of any
incidental PII at capture time by a streaming redactor, telemetry aggregates indefinitely,
merchant PII per PDPA purpose limitation.

---

## 7. External interfaces

| Consumer | Interface | Notes |
|---|---|---|
| Merchant | Web dashboard, REST API, **GitHub Action** (`greenlane-check`) | The CI gate is the habit-former: a readiness regression fails the build, like Lighthouse CI |
| Merchant (Shopify) | Embedded Shopify app | Where most SEA SMB volume actually is |
| Agent platform | `GET /v1/pass?domain=` → credential + tier + open findings; edge-cached | Free at low volume; this is the distribution play |
| PSP / acquirer | Portfolio API: bulk enrol, scheduled runs, webhook on tier change | Sold as a value-added service into their merchant base |
| Issuer / network | **Risk-signal API**: `POST /v1/signal` → score, tier, reason codes, staleness | Priced per inquiry. The signal an issuer can weigh at authorisation on an agent-initiated transaction |
| Everyone | Public registry + status list | Revocation must be publicly checkable or the credential means nothing |

---

## 8. Security, compliance and trust posture

- **Blast radius.** Probe plane is credential-poor and network-restricted; control plane
  holds tenant data but cannot reach merchant infrastructure; signing keys live only in
  KMS. No single compromised component both reads merchant data and issues credentials.
- **Domain ownership proof** (DNS TXT or hosted token) is mandatory before any L1+ probe.
  Without it we are an unsolicited scanner, which is both a legal and a reputational problem.
- **Scope of authority is contractual and explicit** — L3 runs against named sandbox
  environments listed in the order form, with a per-run consent record stored as evidence.
- **Certification liability.** The credential is worded as assurance of observed behaviour
  at a point in time under a named rubric version, not a warranty of security or
  merchantability. Backed by professional indemnity cover before the first paid certificate.
- **Roadmap:** SOC 2 Type II (month 9), PDPA DPO appointed at incorporation, MAS TRM and
  outsourcing-guideline alignment before the first FI contract, ISO 27001 when enterprise
  procurement demands it.
- **Spec drift is a first-class risk.** CI watches the UCP, ACP, AP2, TAP and Web Bot Auth
  spec repositories; a published diff opens a rubric-change PR listing affected check IDs.
  Protocol churn is the biggest technical risk in this business, so it is automated,
  monitored and on someone's dashboard rather than discovered from a customer email.

---

## 9. Cost model

Per full L0–L4 certification run:

| Component | Cost |
|---|---|
| Fargate probe task (~18 min, 2 vCPU / 4 GB) | ~S$0.09 |
| LLM tokens (journey + adjudication, cached prompts) | ~S$0.55 |
| Evidence storage + egress (~120 MB) | ~S$0.02 |
| Temporal + control plane amortised | ~S$0.04 |
| **Total marginal cost** | **≈ S$0.70** |

L0-only free scan: ≈ S$0.02. At S$4,800/year for four certification cycles plus 52 weekly
L0/L1 monitors, direct delivery cost is roughly S$8 against S$4,800 of revenue. The cost
base is people — rubric authors and solutions engineers — not compute, which is the right
shape for this business.

---

## 10. Build plan

| Phase | Weeks | Scope | Proof point |
|---|---|---|---|
| **0 — Rubric** | 1–2 | v0.9 rubric, 40 checks, hand-run against 20 SG storefronts | Evidence that real merchants fail P2/P4 |
| **1 — Free scanner** | 3–6 | L0 + L1, public report, Temporal skeleton, Next.js dashboard | 500 domains scanned, top-of-funnel live |
| **2 — Certification** | 7–12 | L2/L3 with one PSP sandbox, credential issuance, registry, badge | First 10 paid certificates |
| **3 — Distribution** | 13–20 | Shopify app, GitHub Action, portfolio API, PSP pilot | One PSP enrolling merchants |
| **4 — Network signal** | 21–30 | Risk-signal API, reason-code taxonomy, issuer pilot | Score consumed at authorisation |

Team to reach Phase 3: two backend engineers, one full-stack, one payments/rubric domain
lead, one solutions engineer. Five people.

---

## 11. Decisions taken, and what would reverse them

| Decision | Reversal condition |
|---|---|
| Temporal over a queue + state machine | Never — this is the load-bearing choice |
| TypeScript end to end | If probe throughput becomes CPU-bound, move L1 signature probes to Go |
| Deterministic rubric, LLM advisory only | Only after per-check model agreement holds above 0.95 on the golden corpus for two quarters |
| Single region (Singapore) | First EU or US enterprise deal with residency requirements |
| Test-mode only, never live money | Never. This is the line that keeps us out of PCI scope and out of court |
| Score is public, evidence is private | Never — evidence contains merchant commercial data |
