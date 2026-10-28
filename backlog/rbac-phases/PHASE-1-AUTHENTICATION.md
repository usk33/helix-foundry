# Phase 1: Authentication foundation

## Engineering handoff

- **Status:** planned; prerequisite decisions remain open. No authentication
  implementation or deployment is approved by this document.
- **Backlog coverage:** RBAC-02; AUTH-01 through AUTH-08.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md). Approved
  product/security contracts there take precedence; update both documents
  when a reviewed decision changes.
- **Route contract:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Next handoff:** [Phase 2](./PHASE-2-AUTHORIZATION-MIGRATION.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  Ready for contract work only; C-01/02 and applicable C-07 gates block coding.

## Expected outcome

The application can establish a stable, verified account identity through
invitation-only passwords, protect browser sessions, and support activation,
recovery, and privileged MFA. Existing local-only installations retain an
explicit compatibility mode. Authentication code can deploy disabled without
enabling collaboration or changing current users' access.

## Entry criteria and open decisions

- RBAC-00 approval is required before authentication implementation; RBAC-01
  remains a prerequisite for the later authorization phase.
- Approve AUTH-01 persistence, atomic cross-replica coordination, API contracts,
  maintained hash/session/SMTP libraries, and compromised-password screening.
- TOTP with recovery codes and re-enrollment-only recovery is selected.
  Finalize its technical protocol under C-02; method selection is no longer open.
- Use HelixDB only after C-01 proves required atomicity/concurrency. Failure
  requires a new architecture decision; no extra database or local-lock fallback
  is approved. Engineering owns exact contracts/library choices before coding.
- Approve cookie/SameSite, proof-link/CSRF handling, activity classification,
  throttle window/retention, trusted-proxy/IP, and account-disable contracts.
- Declare runtime/workload and numeric hash-concurrency/latency and mail
  capacity budgets. Gmail eligibility, global cap, and delivery validation
  are pending. Starting hash parameters are not production capacity evidence.
- Cloud trust-boundary and exceptional operator-recovery approval remain
  independent launch gates; this phase does not implement Kubernetes.

## Scope and approved behavior

1. Use stable internal user IDs, not email as membership identity. Trim email
   whitespace, lowercase the domain, preserve/exact-match the local part;
   never remove Gmail dots or plus tags. Enforce uniqueness atomically.
2. Passwords contain 15-128 Unicode code points; spaces, paste, and password
   managers are allowed. No truncation, composition rule, or periodic forced
   change. Reject common/compromised passwords without sending raw passwords
   to third parties.
3. Use maintained Argon2id with random per-password salt and versioned
   parameters: starting cost 64 MiB, 3 iterations, parallelism 1. Benchmark
   bounded concurrency; rehash obsolete parameters on successful login.
4. Bootstrap is an operator-issued, 30-minute, single-use setup link. Reissue
   invalidates earlier links; completion verifies email/sets a password and
   atomically closes bootstrap. It does not grant workspace membership.
5. Invitations last 48 hours; separate verification links last 30 minutes.
   Activation needs valid invitation, verified email, and valid password.
   Existing-account acceptance requires authenticated matching verified email.
6. Store only digests of purpose/subject-bound expiring proof tokens; consume
   atomically. GET/prefetch must not consume proof or complete account changes.
   Completion pages must not leak links through logs, analytics, or referrers.
7. Browser sessions have a 12-hour maximum and 30-minute idle timeout; high-
   impact actions require reauthentication within 5 minutes. Only explicit
   authenticated interaction extends activity, never polling/SSE/token traffic.
   Use rotation, revocation, protected cookies, and CSRF/origin enforcement.
8. Password reset uses a 30-minute single-use link, generic response, no
   automatic login, and revokes all prior browser sessions. Preserve API
   tokens, but enforce expiry/revocation, disablement, and current grants.
   Explain that password reset does not contain a stolen API token.
9. Email changes need recent reauthentication, new-address verification, and
   old-address notification. Recovery never re-enables a disabled account or
   changes membership/platform authority.
   At password reset/change or verified email change, revoke prior browser
   sessions and browser-origin job delegations via a durable security revision.
   Valid API tokens and their jobs survive subject to token/current authority.
   Committed email change revokes old-address pending invitations; only an
   authorized workspace owner may reissue to the newly verified address.
10. Login limits: 5 failed attempts/account and 30/IP per 15 minutes. Recovery/
    verification mail: 3/account and 20/IP per hour, plus an approved global
    cap. Counters must be atomic across replicas; no permanent lockout.
11. SMTP is configurable, initially Gmail with a dedicated sender/app password
    configured outside chat/source control. Use authenticated TLS, bounded
    retries, and operator-visible safe failures; tests use a mail sink.
12. Collaborative mode fails closed: invalid configuration stops startup;
    unverifiable/missing/expired/revoked identity cannot become local owner.
    API tokens remain separate from browser sessions.

Subsequent checks deny after committed revocation; ongoing work/streams must
safely stop within 5 seconds, without an atomic-commit exception. Phase 4 owns
broader execution enforcement; session design must support it now.
MFA is mandatory for platform admins and workspace owners before cloud launch.
Require verified enrollment before privileged authority is usable. Privileged
sign-in/reauthentication uses password plus TOTP; fresh reauthentication remains
5 minutes. Password plus a single-use recovery code revokes prior sessions and
permits only re-enrollment, not privileged use until a new factor is verified.
No email-only factor reset; exceptional no-code recovery stays separately gated.
TOTP is phishing-susceptible, an accepted tradeoff versus the WebAuthn option.

Normal logout/session expiry ends session use and its delivery, not previously
issued bounded job delegation. Phase 4 owns execution under that distinct
authority; it never authenticates retrieval or refreshes browser activity.
See the [lifecycle matrix](./IMPLEMENTATION-READINESS.md#lifecycle-acceptance-matrix).
Explicit account/authority/delegation revocation still uses the strict bound.
MFA recovery credentials cannot submit jobs; C-02/04 must settle factor-change/
recovery effects on existing delegations before coding, with no permissive
default. Phase 1 tests revision hooks against delegation/invitation fixtures;
later real-route integration does not become a backwards phase dependency.

Phase 1 owns minimal durable account-security event primitives for bootstrap,
activation, session/recovery, and MFA changes. AUTH-01 designs/proves the
primitive; AUTH-04/05/06/07 integrate it before mutations can succeed. Phase 3
extends the same primitive for workspace lifecycle/reads/retention/export/UI;
Phase 1 must not depend on completed ADMIN-01 or future role-management code.
Phase 1 uses reviewed authority contracts/fixtures; Phase 3 wires real promotion.

## Implementation work packages

### AUTH-01: Contracts and persistence

- **Depends on:** approved account lifecycle and review of existing store/
  transaction patterns.
- **Deliver:** typed account, verified email key, password credential, browser
  session, purpose-bound proof token, account revision, and mode schemas;
  proposed request/response/OpenAPI contracts with public/authenticated policy;
  minimal durable security-event primitive design and atomicity proof.
- **Verify:** uniqueness, validation, secret exclusion, atomic state transitions,
  and concurrent proof consumption using isolated stores.
- **Gate:** review storage/coordination and library choices before installing
  dependencies or committing endpoint shapes as public API. C-01 must prove
  identity uniqueness, proof consumption, invariant/audit atomicity, and
  revision invalidation across independent clients/processes.

### AUTH-02: Password and identity primitives

- **Depends on:** AUTH-01 and reviewed libraries.
- **Deliver:** hash/verify/rehash, code-point validation, email normalization,
  screening, token generation/digest/expiry/purpose helpers.
- **Verify:** Unicode boundaries, spaces, alias/case behavior, invalid hashes,
  screening, exact expiry, and single-use races. No password/hash in responses.
- **Gate:** approve encoding/input limits, screening updates, hash concurrency.

### AUTH-03: Mail and abuse controls

- **Depends on:** AUTH-01 persistence/proofs; AUTH-02 identity normalization.
- **Deliver:** SMTP transport, protected queue/test sink, shared counters,
  bounded retries, redacted operator diagnostics.
- **Verify:** concurrent account/IP/global limits, resend/retry accounting,
  expired queued links, provider outage, generic responses, and secret redaction.
- **Gate:** approve queue protection, proxy/IP rules, windows/retention, Gmail cap.

### AUTH-04: Bootstrap and activation

- **Depends on:** AUTH-01/02/03 and reviewed atomic persistence/audit design.
- **Deliver:** operator bootstrap, invitation proof validation, independent
  verification, activation, and atomic one-time consumption.
- **Verify:** 30-minute bootstrap/verification and 48-hour invitation boundaries,
  reissue invalidation, disabled/unverified accounts, races across replicas,
  and no first-caller owner claim.
- **Gate:** security audit durability and public completion contracts; production
  invitation administration belongs to Phase 3, not this slice.

### AUTH-05: Browser sessions and CSRF

- **Depends on:** AUTH-02, AUTH-03 login throttling, AUTH-04 active accounts.
- **Deliver:** login/status/logout, opaque sessions, rotation, expiry, activity
  classification, fresh reauthentication, cookie/CSRF handling.
- **Verify:** fixation, clock boundaries, polling exclusions, logout/revocation,
  disabled accounts, replica delay, and store outage denial.
- **Gate:** settle cookie and durable invalidation contracts; preserve local mode.

### AUTH-06: Recovery and account maintenance

- **Depends on:** AUTH-03/05; AUTH-01 proof/account revisions.
- **Deliver:** reset/change password, verified email change, session revocation,
  browser-origin delegation security-revision fencing, invitation invalidation
  hooks, API-token/job preservation guidance, and disablement checks.
- **Verify:** reset/email races and uniqueness; no automatic login; all prior
  sessions denied; surviving tokens still obey current authority.
- **Gate:** C-02/03 atomic invalidation/coordination and durable audit.
  Global disable is platform-admin-only with fresh password plus TOTP; reject
  last-active-admin or active-workspace last-owner violations. Phase 3 owns
  route integration; lost-email recovery is not a self-service bypass.

### AUTH-07: Privileged MFA

- **Depends on:** approved MFA/recovery design, AUTH-05/06, and role/authority
  contracts coordinated with RBAC-03/05; AUTH-01 security-event primitives.
- **Deliver:** TOTP enrollment/verification, step-up, promotion/unenrolled
  handling, encrypted factor secrets, digest-stored recovery codes,
  factor change/re-enrollment, recovery-restricted sessions, and assurance.
- **Verify:** counter replay/concurrent use, skew boundaries, abuse limits,
  code single-use races, key/secret redaction, session revocation/restricted
  recovery, and no password-only privileged bypass after role changes.
- **Gate:** C-02 must specify TOTP parameters/skew, secret encryption/key
  lifecycle, bounded throttles, recovery-code generation/rotation, and factor
  changes; no email-only reset or unreviewed recovery fallback.

### AUTH-08: Integration and disabled deployment

- **Depends on:** relevant AUTH slices, route contracts, RBAC-00 approval.
- **Deliver:** login/account UI, SDK/OpenAPI updates, endpoint inventory, docs,
  redaction/fault tests, local-mode regression, and deployment evidence.
- **Verify:** deterministic API/browser journeys and required project checks.
- **Gate:** collaboration disabled; no public hosting or migration by implication.

## Engineering surfaces and handoff artifacts

Start with [API identity/startup](../../apps/api/src/app.ts),
[shared contracts](../../packages/shared/src/index.ts),
[web app](../../apps/web), [SDK](../../packages/sdk), and
[API tests](../../tests/api.test.ts). These are investigation entry points,
not an approved final module layout.

Hand over reviewed schemas/endpoint contracts, dependency choices, proof/
session state diagrams, activity classification, mail/counter failure
contracts, MFA design, and test/benchmark evidence. Coordinate account
disablement and privileged promotion with Phases 2-3 rather than inventing
independent authority rules.

## Verification and definition of done

- [ ] AUTH-01 through AUTH-08 satisfy their approved contracts; unresolved
      decisions are resolved before the affected slice is called complete.
- [ ] Unit/API tests cover positive, negative, boundary, concurrent, and outage
      behavior, including fake-clock expiry and cross-replica invalidation.
- [ ] Browser flows use deterministic accounts/test mail, not real email.
- [ ] Security changes fence browser-origin delegations and old-email invitation
      proofs; surviving token-origin jobs still require current authority.
      Logout does not silently cancel durable jobs or grant retrieval access.
- [ ] Authentication secrets, hashes, cookies, proofs, and SMTP credentials
      never appear in UI inventory, API responses, logs, or audit metadata.
- [ ] Numeric hashing/mail budgets and measured results are recorded.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant
      `pnpm test:browser` checks pass for implementation changes.

Follow [AGENTS.md](../../AGENTS.md); do not install tools, download browsers,
or run opt-in external-database tests without required approval.

## Deployment, disablement, and exclusions

Deploy only within the existing approved boundary with collaboration disabled.
Preserve local-only behavior; invalid collaborative configuration must fail
startup, never downgrade to no-login access. Roll back only to compatible code;
do not discard account/session state or expose a shared installation as local.
No actual migration, secret rotation, service interruption, or cloud deployment
is authorized here.

Excluded: membership/token administration (Phase 3), workspace pilot (Phase 4),
row/column isolation (Phases 5-8), OIDC/SSO, open registration, and custom crypto.
