# RBAC engineering readiness and decision ledger

Reviewed on 28 October 2026 against all eight handoffs, the
[master backlog](../RBAC-IMPLEMENTATION.md), the
[route inventory](../RBAC-ROUTE-POLICY.md), and implementation entry points.
This is a documentation/dependency review, not a completed security review,
concurrency proof, benchmark, implementation, or deployment approval.

## Verdict and meaning of ready

The eight documents are ready for **engineering contract/design work**, not
unconditional feature implementation or production release. No phase is
currently certified ready to code in full. Product choices below are approved;
missing technical contracts and evidence remain explicit gates.

| Readiness level | Required evidence |
| --- | --- |
| Ready for contract work | Bounded outcome, product choices, dependencies, owner role, and acceptance criteria exist |
| Ready to code a slice | Its approved technical contracts and design decisions exist; actual prerequisite slices are complete; required feasibility proof passes |
| Ready to merge/deploy disabled | Reviewed code, migration compatibility, focused and required checks pass; incomplete capabilities remain inaccessible |
| Ready to enable | Integrated correctness, security/operational review, measured budgets, supported configurations, and explicit release approval pass |

Contract work may produce reviewed designs and synthetic test/proof plans
without exposing capabilities. An isolated feasibility spike requires its own
bounded approval; this document does not authorize code, installations, live
data access, or infrastructure changes.

## Engineering takeover recommendation

**Recommendation:** begin a controlled engineering handoff now for contract,
proof-plan, and backlog-triage work. Do not mark the eight phases fully
implementation-ready or start feature coding across them as a batch. Product
scope is sufficiently bounded to assign the work, but critical persistence,
identity, revocation, executor, workload, and cloud-boundary evidence is not
yet complete. Readiness is per slice: a later slice may start only when its
actual prerequisites and applicable contract/proof gates pass.

### First actions for engineering leadership

1. Assign a named engineering DRI, independent reviewer, and required
   product/security/operations approvers to each C-01 through C-08 package.
   The role labels in this ledger are responsibility suggestions, not assigned
   people. Create or identify the team's canonical design/issue records and
   link them here and from the affected phase handoffs before implementation.
2. Close the remaining Phase 0 decisions with the appropriate approvers:
   cloud trust boundary and operator ownership, exceptional account/email
   recovery, migration/quarantine recovery, and explicit workload, failure,
   and retry assumptions. Do not convert an engineering proposal into product
   approval by documenting it as a default.
3. Prioritize C-01 and C-02 together. Prove the required HelixDB atomicity and
   cross-process concurrency properties using independent clients/processes;
   in parallel, review the account/session/MFA API and maintained dependency
   choices. A failed C-01 proof blocks the affected persistence design and
   requires a new architecture decision; it does not authorize a process-local
   lock or silent storage fallback.
4. Develop C-03 and C-04 contracts in coordination with the identity and
   persistence designs. C-03 must cover migration and cross-workspace
   invariants. C-04 must define bounded job authority, external-effect
   boundaries, commit fencing, and measured revocation; keep any operation
   that cannot meet the approved bound disabled.
5. For data isolation, complete POLICY-01's candidate semantics, then run
   only an explicitly approved, isolated synthetic POLICY-02 feasibility
   proof. Record its result before final DATA-00/C-05 approval. Do not build
   the production resolver or describe the prototype as enforcement before
   those gates pass.
6. Define representative workload/topology and propose numeric targets under
   C-07 for product/operator approval before benchmarking. No target, capacity,
   or release threshold is approved by this ledger. Complete C-08 evidence and
   cloud-boundary review before any applicable production enablement.

### Minimum gate for a slice to enter implementation

Before coding a slice, its engineering ticket or approved design record must
identify:

- The stable slice ID, named DRI/reviewer, scope, and explicitly excluded work.
- Completed slice prerequisites from the graph below, plus approved
  product/security decisions and linked technical contracts that apply.
- API/schema/state-transition and failure contracts, including authorization
  order, transaction/retry behavior, and deny/fail-closed behavior where
  relevant.
- Runnable positive, negative, boundary, concurrency, and dependency-failure
  acceptance cases with exact expected outcomes; synthetic fixtures are
  required where policy correctness depends on returned data.
- Migration, feature-gating, disablement, observability, and compatible
  rollback expectations for any persistent or externally visible behavior.
- An approved workload/budget target when the slice is capacity-sensitive;
  measured results are evidence for completion/release, not a substitute for
  an approved target.

The responsible reviewer records the contract/proof disposition and links
the evidence before the slice is marked ready to code. Any changed behavior
or newly discovered policy choice returns to the designated approver; it must
not be resolved through an implementation default. This gate is a handoff
standard, not a new product decision or authorization to begin code.

## Approved decisions from this review

| ID | User-selected direction | Consequence |
| --- | --- | --- |
| D-01 | HelixDB-first, conditional on concurrency/atomicity proof | No new database is approved. A failed proof blocks the design and requires a new decision, not a process-local lock or silent fallback |
| D-02 | Password plus authenticator-app TOTP and recovery codes | No WebAuthn requirement for this release. TOTP is phishing-susceptible; record that tradeoff and enforce replay/abuse controls |
| D-03 | Privileged enrollment before authority is usable; restricted recovery | Password plus single-use recovery code revokes old sessions and permits only factor re-enrollment; no privileged access until a new factor is verified. No email-only MFA reset |
| D-04 | Early durable account-security audit | Phase 1 owns minimal security-event primitives; Phase 3 extends them for workspace lifecycle, audit reads, retention/export, and UI |
| D-05 | Engineering owns technical contract gates | Engineering authors schemas, endpoints, libraries, modules, transactions, fencing, and environment-specific settings; review before affected coding. Behavior changes still require product/security approval |
| D-06 | Bounded per-subject dataset grants; no groups initially | Typed equality/set-membership predicates; AND within a grant, OR row scopes across grants; no arbitrary policy SQL or inherited group grants |
| D-07 | One column allowlist per subject/dataset | Multiple row grants must have identical allowlists. Reject conflicting authoring; deny malformed/stale conflicting policy. Never independently union all rows and columns |
| D-08 | Owners directly manage policies; self-grant risk accepted | `data_policies.manage` is owner-only and browser-only with reauthentication within 5 minutes, durable audit, and revision invalidation. An owner may explicitly broaden their own policy; no implicit read bypass or two-person approval is required |
| D-09 | Parent-bounded descendants and no declassification | Children cannot be more visible than parent and are not independently shareable. Check current source access; deny/recompute unprovable saved outputs. Recompute aggregates per reader; broader shared aggregates/declassification deferred |
| D-10 | First restricted-data release is read-only | DATA-06/SCOPE-05 implement explicit denial of restricted-subject data writes. Fine-grained write enablement is future scope needing separate approval |
| D-11 | Engineering proposes workload and numeric targets | Product/operator approve before measurement/release assessment. No synthetic numbers or production capacity promises are approved here |
| D-12 | All humans/tokens in isolation-enabled workspaces are restricted | All business-data mutations deny, including owner/editor requests. No per-user unrestricted-writer exemption; policy edits cannot remove the restriction. Local/pre-isolation modes remain separately explicit |
| D-13 | Manual jobs use bounded durable user delegation | Normal browser logout/session expiry does not end an issued delegation. Bind it to one job, actor/workspace/intent, original credential ceiling and inputs; never reusable as a browser/API credential or service identity |
| D-14 | Browser-origin delegations revoke on account-security changes | Password reset/change and committed verified-email change revoke prior browser sessions and browser-origin job delegations; valid API-token-origin jobs remain bounded by the preserved token and current authority |
| D-15 | Platform admins disable global accounts | Browser-only, password plus TOTP reauthentication within 5 minutes, durable audit and current authority at commit. Owners remove workspace membership only. Reject last-owner/last-active-admin violations; transfer ownership first |
| D-16 | Email change revokes old-address pending invitations | Only an authorized workspace owner may explicitly reissue to the newly verified address; no automatic transfer/reissue. Existing stable-ID memberships remain unchanged |

D-08 intentionally accepts an owner self-grant risk; it is not separation of
duties. Browser/reauth/audit controls reduce credential misuse but do not
prevent a malicious authorized owner from broadening their own grants.
TOTP and self-grant tradeoffs must appear in release/security documentation.

## Second-pass lifecycle contract

These decisions were confirmed in the second review and the user's instruction
to continue with the pending recommendations. Durable jobs were explicitly
selected by the user instead of the earlier credential-bound recommendation.
Normal logout is therefore not a promise to cancel already delegated jobs.
It still immediately ends use of that browser session and its streams.

### Durable manual-job authority

- At authenticated submission, atomically persist job-specific delegation with
  job ID, actor, workspace, original credential kind/ID and ceiling, approved
  operation intent, input references/revisions, issue time, and hard expiry.
  Submission must have current authority and required MFA/reauthentication.
- Its immutable expiry is no later than the job deadline. C-04 must specify a
  numeric maximum lifetime, deadline calculation, queue-wait accounting,
  retries/restarts, clock/replica rules, and fresh-reauth action eligibility
  before implementation. This review does not invent a numeric lifetime.
- Normal browser logout/idle/absolute expiry does not revoke the delegation,
  refresh browser activity, or create a login. Explicit cancellation, delegation
  expiry, account disablement, membership/grant/policy loss, workspace state,
  or originating API-token revocation/expiry denies affected work at subsequent
  checks and safely stops it within 5 seconds.
- Never broaden an original grant ceiling on retries/promotion or refresh
  privilege silently. Changed intent/inputs require reviewed reauthorization
  within the original delegation; an incompatible operation needs new explicit
  authority, not a conversion to a service job.
- Password reset/change and verified email change revoke all prior browser
  sessions and browser-origin delegations through an atomic security revision
  or equivalent fail-closed fence. Preserve valid API tokens and their jobs
  subject to current authority; resetting a password does not contain them.
- Restricted MFA-recovery credentials permit only re-enrollment, not job
  submission or access to existing privileged jobs. C-02/04 must explicitly
  specify factor-change/recovery effects on existing delegations before coding;
  no missing contract may default to continued privileged authority.
- A delegation is usable only by the internal execution path for its one job.
  It cannot authenticate retrieval, callbacks requiring a live browser, docs,
  management endpoints, or a new job. Reauthenticate and authorize downloads/
  saved-result retrieval using the caller's current ordinary credential.
- Provide an explicit, authorized "cancel my active jobs" action distinct from
  logout; validate actor/job ownership and current operation authority. No
  implicit owner/admin moderation or access to another person's private job.
  Cancellation after loss of access may also occur through the system's
  revocation path; no user grant is required to stop work that is unauthorized.
- Scheduled/service writers need separate reviewed narrow authority; never
  convert a manual delegation into persistent automation. In isolated
  workspaces they do not imply a human write exemption or data-read bypass.

### Lifecycle acceptance matrix

| Committed event | Browser session/delivery | Browser-origin delegated job | API-token-origin job |
| --- | --- | --- | --- |
| Normal logout/session expiry | Session denies; associated delivery stops within 5 seconds | May continue only within hard deadline/current authority | Unchanged; token/current authority still required |
| Explicit job cancellation/delegation expiry | No unrelated session authority change | Affected work stops within 5 seconds | Affected work stops within 5 seconds |
| Password reset/change | All prior sessions deny; delivery stops | All prior browser-origin delegations revoke and work stops | Valid tokens/jobs survive subject to token expiry/revocation/current rights |
| Verified email change | All prior sessions deny; delivery stops | All prior browser-origin delegations revoke and work stops | Valid tokens/jobs survive subject to current rights; old-address invitations revoke |
| Originating API-token revoke/expiry | Unrelated browser credentials unchanged | Unchanged unless current account/rights also change | Affected delegation/work stops within 5 seconds |
| Global account disablement | All credentials deny | All account jobs deny/stop | All account jobs deny/stop |
| Membership/role/policy/grant loss | Subsequent affected access denies; delivery stops | Affected delegated authority denies/stops | Affected delegated authority denies/stops |

All stops use the existing strict bound measured from durable revocation (or
effective expiry), with no atomic-commit exception. Already committed effects/
delivered data cannot be recalled. No test may equate "cancel requested" with
proof that execution/commit/delivery stopped.

### Isolation and global disablement

In an isolation-enabled workspace, all humans and user API tokens are restricted,
including accounts with every column/row explicitly granted. Role, policy
broadening, token issuance, or client flags cannot turn them into unrestricted
writers. Ownership permits only the explicitly authorized control-plane
operations; it does not permit business-data writes. C-05/06 must classify
read-only SQL/answer/artifact persistence versus business-data mutations and
prove mixed/generated/resumed paths cannot bypass denial.

Global disablement is a platform-admin-only operation with fresh password plus
TOTP and durable audit. In the same concurrency-safe authority design, reject
disablement that would remove the last active platform admin or leave any active
workspace without an active owner. Do not silently transfer ownership. Check
creation, transfer, account state, and disablement races across all affected
workspaces. Disablement denies browser, token, delegated and service actions
that require that account and quarantines its private/shared content. No
self-service account deletion or emergency bypass is in this release.

Verified email change revokes pending invitations for the old identity key
when the change commits; notify the user to request owner reissue. Invitation
acceptance racing that change must not consume stale proof. Existing stable-ID
memberships remain intact. Phase 1 builds/tests the security-revision/contract
hooks with fixtures; Phase 3 integrates real invitation/global-disable routes,
without introducing a backwards completion dependency.

## Findings reconciled

| Finding | Resolution |
| --- | --- |
| Parent backlog items appeared as prerequisites of their own child slices | Parent item means coverage/acceptance, not a completed prerequisite. The completion graph below uses slice-to-slice edges only |
| Phase 1 needed durable audit but Phase 3 depended on completed authentication | AUTH-01 designs and proves minimal durable security-event primitives; AUTH-04/05/06/07 integrate them. ADMIN-01 extends/reuses the primitive after authorization; no backwards completion edge |
| AUTH-07 referenced future role management | Phase 1 consumes reviewed role/authority contracts and fixtures; Phase 3 implements promotion/transfer integration before enablement |
| Phase 5 feasibility could depend on its own completed semantics/resolver | POLICY-01 supplies candidate semantics; POLICY-02 uses synthetic fixtures; final DATA-00 approval follows proof, before POLICY-03 |
| “Clients cannot set attributes” conflicted with owner-managed assignment APIs | Query/model payloads never supply authority. Only the authorized, audited management path may update trusted assignments, including an owner's own assignment |
| DATA-06 required full writes despite read-only release choice | Restricted data-changing intents explicitly deny, including generated and indirect paths; full old/new-row write semantics are deferred |
| “Implementation-ready” lacked tangible schema/endpoint/budget artifacts | The contract checklist and phase status below block ready-to-code claims until reviewed artifacts exist |
| Restricted users had no authoritative classification | All humans/tokens in an isolated workspace are restricted; owner policy edits cannot evade read-only rules |
| Logout was conflated with durable-job revocation | Session/delivery ends, while explicit bounded delegation may survive; account-security/token/rights changes still fence affected work |
| Disable authority and email/invitation coordination were unspecified | Platform-admin disable with cross-workspace owner/admin invariants; committed email change revokes old invitations and only owners reissue |

The current [store interface](../../apps/api/src/store.ts) exposes
scope-version commits and a retrying single-scope transaction helper. It does
not by itself establish cross-scope atomicity, uniqueness under all races, or
the five-second revocation guarantee. The current
[executor](../../services/executor/src/engine.ts) loads snapshot relations
before untrusted SQL; external-access restrictions alone are not row/column
isolation. These are concrete proof obligations, not verified capabilities.

## Completion dependency graph

Only the IDs in the second column are hard **slice completion** prerequisites.
Product approvals, contracts, parent acceptance, rollout integration, and
feasibility gates remain additional constraints, not implicit circular edges.
Numeric order does not add dependencies. Parent items complete only when their
mapped slices and original acceptance criteria complete.

| Slice | Completed slices required |
| --- | --- |
| AUTH-01 | none |
| AUTH-02 | AUTH-01 |
| AUTH-03 | AUTH-01, AUTH-02 |
| AUTH-04 | AUTH-01, AUTH-02, AUTH-03 |
| AUTH-05 | AUTH-02, AUTH-03, AUTH-04 |
| AUTH-06 | AUTH-01, AUTH-03, AUTH-05 |
| AUTH-07 | AUTH-01, AUTH-05, AUTH-06 |
| AUTH-08 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07 |
| ACCESS-01 | AUTH-08 |
| ACCESS-02 | ACCESS-01 |
| ACCESS-03 | ACCESS-01 |
| ACCESS-04 | ACCESS-01 |
| ACCESS-05 | ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04 |
| ADMIN-01 | ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04 |
| ADMIN-02 | ADMIN-01, ACCESS-05 |
| ADMIN-03 | ADMIN-01, ADMIN-02, ACCESS-04 |
| ADMIN-04 | ADMIN-01, ACCESS-05 |
| ADMIN-05 | ADMIN-02, ADMIN-03, ADMIN-04, ACCESS-03 |
| ASYNC-01 | ACCESS-05 |
| ASYNC-02 | ASYNC-01, ADMIN-01 |
| ASYNC-03 | ASYNC-01, ACCESS-03 |
| ASYNC-04 | ASYNC-02, ASYNC-03, ADMIN-05 |
| POLICY-01 | none |
| POLICY-02 | POLICY-01 |
| POLICY-03 | POLICY-02, ACCESS-05 |
| POLICY-04 | POLICY-03, ADMIN-05 |
| READ-01 | POLICY-03, POLICY-04 |
| READ-02 | READ-01, POLICY-02 |
| READ-03 | READ-02, ADMIN-04 |
| READ-04 | READ-02, READ-03, ASYNC-03 |
| SCOPE-01 | READ-03, READ-04 |
| SCOPE-02 | SCOPE-01 |
| SCOPE-03 | SCOPE-02, ASYNC-02, ASYNC-03 |
| SCOPE-04 | SCOPE-02, ASYNC-02, ASYNC-03 |
| SCOPE-05 | SCOPE-02 |
| RELEASE-01 | SCOPE-03, SCOPE-04, SCOPE-05, POLICY-04, ASYNC-04 |
| RELEASE-02 | RELEASE-01 |
| RELEASE-03 | RELEASE-01 |
| RELEASE-04 | RELEASE-01, RELEASE-02, RELEASE-03 |

POLICY-01 completes a **candidate** specification, not final DATA-00 approval.
POLICY-03 requires final DATA-00 approval, including POLICY-02 results.
ACCESS-05 completion is implementation/rehearsal, not running production cutover.
ADMIN-01 requires completed RBAC-03 authorization (ACCESS-01 through ACCESS-04).

### Parent backlog item to slice mapping

Handoffs and the master backlog often state prerequisites as parent items
(for example "RBAC-03/04"), while the graph above uses slice IDs. Use this
mapping to translate between them. A parent item is **coverage and acceptance**:
it completes only when all of its mapped slices and its own original acceptance
criteria complete. Naming a parent item as a prerequisite means "that item's
mapped slices are complete", never "finish the parent before its own child".

| Parent item | Mapped slices | Representative completion slice |
| --- | --- | --- |
| RBAC-02 | AUTH-01 through AUTH-08 | AUTH-08 |
| RBAC-03 | ACCESS-01 through ACCESS-04 | ACCESS-04, with ACCESS-02/03 |
| RBAC-04 | ACCESS-05 | ACCESS-05 |
| RBAC-08A | ADMIN-01 | ADMIN-01 |
| RBAC-05 | ADMIN-02, and ADMIN-03's ownership-transfer scope | ADMIN-03 |
| RBAC-06 | ADMIN-04 | ADMIN-04 |
| RBAC-08 | ADMIN-01, ADMIN-05 | ADMIN-05 |
| RBAC-07 | ASYNC-01, ASYNC-02, ASYNC-03 | ASYNC-03 |
| RBAC-09 | ASYNC-04 | ASYNC-04 |
| DATA-00 | POLICY-01, POLICY-02 | POLICY-02 plus explicit final approval |
| DATA-01 | POLICY-03, POLICY-04 | POLICY-04 |
| DATA-02 | READ-01, READ-02 | READ-02 |
| DATA-03 | READ-03, READ-04 | READ-04 |
| DATA-04 | SCOPE-01, SCOPE-02 | SCOPE-02 |
| DATA-05 | SCOPE-03, SCOPE-04 | both required; neither alone completes it |
| DATA-06 | SCOPE-05 | SCOPE-05 |
| DATA-07 | RELEASE-01 through RELEASE-04 | RELEASE-04 |

Where a handoff names a parent item and the graph names a later slice, the
graph is authoritative and is the stricter requirement. For example, ASYNC-01's
handoff text names RBAC-03/04 and ACCESS-01, while the graph requires
ACCESS-05; ACCESS-05 transitively includes ACCESS-01 through ACCESS-04, so the
two statements agree and the graph edge is the one to schedule against.

ADMIN-03 is deliberately split. Its ownership-transfer scope belongs to RBAC-05,
which already requires transactional last-owner and transfer invariants. Its
platform grant/revoke and global account-disable scope implements the approved
platform-administration contract rather than a single parent item: enforcement
sits under RBAC-03, audit under RBAC-08A/RBAC-08, and the authority rules come
from guardrails 12 and 15 with D-15. Treat all three as required for ADMIN-03.

### Critical path and achievable parallelism

Derived from the graph above; recompute whenever an edge changes. This is a
scheduling observation, not a new dependency or an estimate of effort.

- The longest chain is **25 of the 39 slices**: AUTH-01 -> AUTH-02 -> AUTH-03 ->
  AUTH-04 -> AUTH-05 -> AUTH-06 -> AUTH-07 -> AUTH-08 -> ACCESS-01 -> ACCESS-02
  -> ADMIN-01 -> ADMIN-02 -> ADMIN-03 -> ADMIN-05 -> POLICY-04 -> READ-01 ->
  READ-02 -> READ-03 -> READ-04 -> SCOPE-01 -> SCOPE-02 -> SCOPE-03 ->
  RELEASE-01 -> RELEASE-02 -> RELEASE-04.
- Maximum concurrent width is **three slices**, reached only at
  ACCESS-02/03/04, ADMIN-02/ADMIN-04/ASYNC-01/POLICY-03, ADMIN-03/ASYNC-02/
  ASYNC-03, and SCOPE-03/04/05.
- Only **AUTH-01 and POLICY-01** have no slice prerequisite at all. AUTH-01
  through AUTH-08 are fully serial.

**Planning consequence.** This program is dependency-bound, not staffing-bound.
Adding engineers cannot compress the authentication chain or the
READ -> SCOPE -> RELEASE tail, so a schedule that assumes broad parallelism
will be wrong. Staff the critical path first and use remaining capacity for
contracts, fixtures, and test infrastructure.

**Recommended sequencing change: de-risk POLICY-02 early.** POLICY-01 and
POLICY-02 depend on no authentication or authorization slice, yet POLICY-02 is
the gate most likely to invalidate downstream design: it asks whether the
executor can expose only authorized relations to untrusted SQL. Running it in
phase order would surface a negative result only after Phases 1-4 are built,
and 14 of the 25 critical-path slices sit downstream of it. Schedule the
bounded synthetic POLICY-01/POLICY-02 track in parallel with AUTH-01, under its
own explicit spike approval.

This reorders discovery, not approvals. POLICY-02 still requires its own
bounded approval, uses synthetic fixtures only, enables no restricted users,
and does not satisfy DATA-02 production enforcement. A failed proof must stop
and revise the design rather than fall back to a weaker filtering approach.

## Missing contract packages and owners

Owner labels below assign responsibility to roles, not invented named people.
Engineering leadership must assign a person and reviewer before a package
enters implementation. Contracts may live in the approved engineering system;
link the actual reviewed artifact here and from the affected phase.

| Package | Responsible roles | Required contents | Blocks |
| --- | --- | --- | --- |
| C-01 Control-plane persistence proof | API/data engineering; security reviewer | Scope placement; unique email/identity/proof consumption; account/workspace/admin invariants; audit/business atomicity; revision invalidation; crash/retry tests across independent clients/processes; no irreversible effects inside retry callbacks | AUTH-01 and dependent implementation |
| C-02 Accounts/session/MFA API | API + web + SDK; security reviewer | Exact method/path, request/response/error schemas, auth/CSRF/reauth/MFA policy, state transitions, cookie/proxy/activity handling, TOTP secret encryption/key lifecycle, skew/replay/abuse controls, digest recovery-code lifecycle, library versions and screening source | AUTH-02 through AUTH-08 |
| C-03 Authorization/migration/lifecycle | API + operations; security/product reviewers | Typed role/token grants; new endpoint inventory; sharing/descendant schema; platform/account-disable authority; collision and maintenance coordination; atomic audit/invariants; token expiry contract; migration/rollback rehearsal plan | ACCESS and ADMIN implementation |
| C-04 Async revocation | API + executor + operations; security reviewer | Actor/service intents, session/logout job lifetime, legacy queues, revision/fencing, external side-effect boundaries, cancellation/commit and stream clocks, explicit disabled operations, fault matrix | ASYNC-01 through ASYNC-04 |
| C-05 Data-policy semantics/resolver | Data/API engineering; product/security reviewers | Typed predicate schema/operators/type/null rules, exact examples below, owner administration, trusted restricted-subject classification (no request/role/policy-update escape from write denial), schema evolution, subject grants, projection, revision/fingerprints, safe errors/metadata/history; final DATA-00 proof disposition | POLICY-03/04 and dependent implementation |
| C-06 Executor and derived coverage | Executor + data + AI + web; security reviewer | Plan trust/freshness, isolated relations, lineage/classification, reader recomputation, stored-result access, model/voice context, cache partition + recheck, explicit read-only write-intent denial | READ/SCOPE implementation |
| C-07 Workload, capacity, and operations | Engineering/performance + operator; product approval | Actual users/workspaces/data sizes, concurrency and replica/resource topology, baseline, percentile/error criteria, hash/auth/query/export latency/memory, migration window, mail provider/global cap, review/stop thresholds | Capacity-sensitive design completion, benchmarks, enablement |
| C-08 Release evidence and cloud boundary | Engineering/security/operations release owners | Supported surface/config matrix, test/evidence IDs, findings disposition, incident/restore/exceptional-recovery procedure, MFA/cloud network/storage/coordination approval, rollback and explicit sign-off | ASYNC-04 and RELEASE-04 enablement |

No exact new endpoint/schema/library is approved merely by naming it here.
Add endpoint policies before code registration. Each package must distinguish
approved design, runnable acceptance tests, and measured results.

Second-pass additions to required contracts:

- **C-01:** prove atomic delegation issuance/security-revision fencing,
  old-email invitation invalidation, and cross-workspace last-active-owner/
  admin invariants. A single-scope transaction alone is not proof.
- **C-02:** define password/email security revision, factor recovery/change
  effects on existing delegations, and ordinary versus recovery-only credentials.
- **C-03:** define global-disable method/path/errors, browser/MFA authority,
  active-owner checks in every workspace, audited invitation revocation and
  explicit owner reissue; do not expose private jobs through disable tooling.
- **C-04:** implement the lifecycle matrix, numeric delegation maximum/deadline,
  cancel-my-jobs contract, no implicit privilege refresh, and safe external
  effect/callback boundaries. Logout survival is not a five-second exception.
- **C-05/06:** derive restricted status from trusted workspace isolation mode,
  no human exemptions; classify control-plane versus data-changing intent.
- **C-07/08:** measure delegation stop/expiry across replicas and recovery events;
  document that logout does not cancel jobs and a password reset preserves
  valid API-token-origin automation. No production capacity is approved here.

## Concrete data-policy acceptance fixture

Synthetic `orders` dataset; both Alice and Bob are workspace editors. Attribute
assignments are managed through the owner-only audited control path, never a
query parameter. Values are fictional test data.

| id | region | revenue | email |
| --- | --- | --- | --- |
| 101 | East | 10 | east-one@example.invalid |
| 102 | West | 20 | west@example.invalid |
| 103 | East | 30 | east-two@example.invalid |
| 104 | North | 40 | north@example.invalid |

- Alice: `region IN subject.regions`, regions = `[East]`, columns =
  `[id, region, revenue]`. `SELECT *` yields IDs 101/103 and exactly those
  three columns; sum of revenue is 40. Any reference to `email`, including
  a predicate/order/group/join reference, denies rather than returning data.
- Bob: regions = `[West]`, columns = `[id, region, email]`. `SELECT *` yields
  only ID 102 and those three columns; revenue is not queryable.
- Carol: two grants for East and West with identical columns `[id, region]`.
  Their OR yields IDs 101/102/103 without duplicates and exactly two columns.
  Adding a third grant with `[id, email]` is rejected; conflicting stored
  allowlists deny the dataset rather than silently choose or union them.
- Dave: no grant; query/preview/export deny. Missing required attributes or an
  invalid/unknown predicate denies; a valid empty region set matches zero rows.
- A new `phone` column is not granted. A historical snapshot missing the
  predicate field denies. A null region does not match these non-null sets;
  broader null/type behavior must be explicit in C-05 before coding.
- CSV/Parquet, preview/history, metadata and authorized AI context must reflect
  the same permitted data. No source sample/count may reveal North or denied
  fields to these users. Metadata contract must specify exact reader-safe shapes.
- Warming a cache as Bob never gives Alice email. Sharing a Bob artifact does
  not authorize its data for Alice; deny or recompute for Alice with current
  provenance. A child remains bounded by its parent visibility.
- All four subjects are restricted. Their ingestion/record edits/reverts/
  relationship writes/generated data changes deny even if their role is editor.
  A current owner may explicitly broaden their own grant via the reviewed
  management path; that change is audited/revisioned, not an implicit bypass.
- On revocation commit, subsequent access denies and protected work/delivery
  stops within 5 seconds. Assert exact outputs/artifacts and durable effects,
  not only response status or cancellation acknowledgement.

This fixture is an acceptance seed, not a substitute for complete typed API/
executor schemas or additional multi-dataset/join/history/derived cases.

## Per-phase current readiness

| Phase | Ready now | Before affected feature coding | Before enablement |
| --- | --- | --- | --- |
| 1 | C-01/02 design and proof planning | RBAC-00 design gates, approved C-01/02 and required C-07 targets; no future Phase 3 audit dependency | AUTH acceptance, measurements, disabled deployment only |
| 2 | C-03 design and migration test planning | Completed Phase 1, C-03 reviewed, collision/coordination proof | Migration operational approval, full route coverage; collaboration still off |
| 3 | Audit/lifecycle contracts | RBAC-03/04 prerequisites as mapped; C-03 reviewed; early security primitive reusable | Durable audit/invariants; Phase 4 gates collaborative rollout |
| 4 | C-04/07/08 contracts and timing-test design | Relevant ACCESS/ADMIN prerequisites, fencing/external-boundary design | Reviewed workspace pilot, measured strict revocation; separate cloud gates |
| 5 | Candidate C-05 and bounded feasibility design | Approved proof plan; final DATA-00 before resolver/admin coding | Feasibility + persistence/audit; restricted users off |
| 6 | C-06 plan/executor contract | Final DATA-00, Phase 5 prerequisites, trusted plan/resource design | Full direct coverage; restricted users off |
| 7 | C-06 provenance/AI/cache/read-only-denial design | Required READ/ASYNC prerequisites and approved C-06 | All supported derived/AI/cache paths protected and writes denied; launch off |
| 8 | Evidence/coverage/rollout planning | Integrated predecessor capabilities for executable verification | C-07/08 evidence and explicit supported-release approval |

Phase 0 remains open. Separately reviewed lost-email/last-admin/quarantine
operator recovery and the cloud trust boundary are still outstanding.
Engineering-owned contracts are not waivers of product/security gates.

## Glossary of load-bearing terms

These terms carry security meaning across all eleven documents and must be
implemented consistently. Each definition restates an already-approved rule and
points to its authoritative source; none creates a new decision. Where a
definition and its source section ever diverge, the source section governs.

| Term | Meaning for implementation | Authoritative source |
| --- | --- | --- |
| Local mode / collaborative mode | Explicit, server-selected deployment modes. Local mode preserves existing no-login local-owner behavior; collaborative mode requires configured account/session security and fails startup instead of downgrading. | Master backlog, guardrail 3 |
| Principal | The authenticated identity behind a request: a user account via browser session, or a user API token acting for that account. | Master backlog, principal and credential model |
| Permission | A named internal operation right (for example `data.manage`), evaluated server-side. Permissions replace ordinal role comparisons; custom roles are out of scope. | Master backlog, membership and role model |
| Credential ceiling | A token's grants act as an upper bound, never an independent identity. Effective rights are the intersection of token grants and the user's current membership permissions. | Master backlog, API tokens |
| Platform admin | Authority to provision cloud workspaces and manage platform authority and global account disablement. Distinct from workspace ownership; confers no membership or data access. | Master backlog, guardrail 12 |
| Security revision | A durable per-account fence. Password reset/change and committed verified-email change advance it, revoking prior browser sessions and browser-origin job delegations while preserving valid API tokens. | Second-pass lifecycle contract; D-14 |
| Job delegation | Bounded one-job authority issued atomically at authenticated submission, binding actor, workspace, originating credential kind/ID and ceiling, intent, inputs, and an immutable expiry no later than the job deadline. It survives ordinary logout but never authenticates a request, retrieval, callback, or another job. | Durable manual-job authority; D-13 |
| Service authority | Narrow reviewed authority for scheduled or system work with no human actor. It never impersonates a human owner, and its output may not be served to ordinary readers under that authority. | Master backlog, background work |
| Isolation-enabled workspace | A server-controlled workspace classification that activates data policies. Policy edits, role changes, and client flags cannot disable it. | D-12; Phase 5 required behavior 9 |
| Restricted subject | Every human account and user API token in an isolation-enabled workspace, including owners holding every read grant. Read-only for business data in the first release. | D-12; Phase 7 write contract |
| Data policy / grant | A per-subject, per-dataset record binding a typed row predicate, a column allowlist, an action, and a revision. AND within a grant; OR across row scopes only when column allowlists are identical. | D-06/D-07; policy contract |
| Trusted subject attributes | Security attributes sourced only from server-managed assignments or approved identity claims, updated solely through the audited owner-only management path. Never accepted from request bodies or model output. | Policy contract; D-08 |
| Effective-access fingerprint | A derived identifier of a reader's complete current access, covering grants, trusted attributes, and policy revision. Used in authorization plans and cache identity so a broader reader's result can never be served to a narrower one. | READ-01; SCOPE-04 |
| Authorization plan | A validated, server-created internal object binding principal, credential/action, workspace, dataset/version, policy revision, and effective-access fingerprint, passed to the executor. Clients and models can neither supply nor override it. | Phase 6 direct-read contract 1 |
| Parent-bounded descendant | A derived or saved child artifact that can never be more visible than its parent and is not independently shareable. Unprovable current source access denies or recomputes. | D-09 |
| Quarantine | On creator removal or account disablement, their private and shared content is withheld from every retrieval surface, with no automatic transfer, unquarantine, or resharing on return. | Sharing contract; D-15 |
| Declassification | Broadening a restricted output's audience. Deferred in this release: such requests deny rather than widen access. | D-09; Phase 7 exclusions |
| Reauthentication freshness | Privileged actions require authentication within the preceding 5 minutes; privileged users additionally present password plus TOTP. | Master backlog, guardrail 5; D-02/D-03 |
| Revocation bound | After a revocation commits, later authorization checks deny and affected in-flight work and delivery stop within 5 seconds, with no atomic-commit exception. Timing starts at durable commit, not UI acknowledgement. | Master backlog, guardrail 5 |
| Parent item vs slice | A parent backlog item (RBAC-xx, DATA-xx) is coverage and acceptance; a slice (AUTH-xx and similar) is the unit of completion scheduling. | Parent backlog item to slice mapping |

## Documentation validation evidence

- Second pass reconciled confirmed D-12 through D-16 across all eight handoffs,
  master and route contract; added durable-delegation lifecycle and acceptance
  distinctions without adding a backwards slice dependency. These are product
  contracts, not executable schemas or measured evidence.
- Reviewed all eight phase handoffs, the master backlog, and route-policy
  contract; distinguished parent coverage, completed prerequisites, contract
  gates, and rollout evidence.
- Validated 39 slice IDs against master definitions and a 39-node/87-edge
  acyclic completion graph, including transitive authentication, migration,
  audit, policy-administration, and release dependencies.
- Checked relative file targets, Markdown heading anchors, slice references,
  table shapes, fences, and whitespace across all 11 planning documents.
  Final cross-reference checks pass for 152 relative links and 10 heading anchors,
  D-01 through D-16, and applicable lifecycle/classification assertions in each
  of the eight handoffs; the 39-node/87-edge graph remains acyclic. The
  master backlog's existing two-space priority-line breaks are intentional
  Markdown formatting and were preserved.
- Preserved the 83 unique historical method/path entries, and verified that
  count against the current API source on 28 October 2026: `app.ts` registers
  7 handlers of which 5 are `/api/v1` (`/api/health` and `/api/openapi.json`
  are documented exceptions), plus workspace 20, data 16, pipelines 2,
  ontology 9, analyst 14, hosting 6, and onboarding 10 registrations whose
  `for` loop over `recommendations` and `build` expands to 11. The total is
  5+20+16+2+9+14+11+6 = 83, matching the inventory. This is a counting check
  against today's source, not a runtime policy guard or the RBAC-03
  registration test, which remains unimplemented.
- Verified every cross-document identifier resolves: all slice, RBAC-xx/DATA-xx,
  C-01 through C-08, and D-01 through D-16 references used anywhere in the 11
  documents have a definition, with no orphan or dangling ID.
- Reconciled each handoff's stated slice prerequisites against the completion
  graph. The remaining differences are parent-item shorthand rather than
  conflicts; the new parent-to-slice mapping records the translation and names
  the graph as authoritative.
- Derived the critical path and parallel waves from the graph: a 25-slice
  longest chain and a maximum concurrent width of three. These are scheduling
  observations, not new dependencies, effort estimates, or dates.
- No application tests, code changes, concurrency/security proof, benchmark,
  dependency installation, migration, or deployment were performed.
