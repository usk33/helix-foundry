# RBAC implementation backlog

This document turns the current workspace-role foundation into an
implementation backlog for authenticated collaboration. It is a proposal, not
a description of shipped functionality. The current product is local-first,
single-user, has no sign-in, and treats requests without an `Authorization`
header as the local owner. Do not interpret this backlog as permission to
expose the application beyond its current local-only boundary.

## Outcome

Deliver authenticated, multi-user workspace access with server-enforced
permissions, invitations, membership administration, and auditable changes.
Extend that foundation with a gated data-isolation workstream for different
users' rows and columns within a workspace, while preserving existing workspace
data and the current single-user
installation path unless the product owner explicitly decides otherwise.

The approved future product direction is a cloud-hosted Kubernetes deployment
for broader multi-user reach, rather than a local-only production service.
This is a planning decision, not approval to expose the current application.
Cloud hosting requires a separately approved deployment/security design and
operational validation before activation. Existing local installations retain
an explicit compatibility mode.

The initial release should retain the three role presets already present:
`viewer`, `editor`, and `owner`. Permissions are named internally; custom
roles are not part of this backlog.

## Dedicated engineering handoff documents

Use these phase-specific documents to share implementation scope with the
engineering team. Each includes expected outcomes, entry criteria, stable
work-package IDs and dependencies, implementation deliverables, verification,
open decisions, and deployment/disablement boundaries.

| Phase | Engineering handoff | Expected milestone |
| --- | --- | --- |
| 1 | [Authentication foundation](./rbac-phases/PHASE-1-AUTHENTICATION.md) | Verified identity, protected sessions, recovery, and privileged MFA; collaboration disabled |
| 2 | [Workspace authorization and compatibility migration](./rbac-phases/PHASE-2-AUTHORIZATION-MIGRATION.md) | Complete route/resource enforcement and rehearsed explicit migration |
| 3 | [Audited membership and token lifecycle](./rbac-phases/PHASE-3-AUDITED-ADMINISTRATION.md) | Durable audited administration and constrained token grants |
| 4 | [Background authorization and workspace-RBAC pilot](./rbac-phases/PHASE-4-WORKSPACE-RBAC-PILOT.md) | Verified async/stream revocation and approved controlled workspace pilot |
| 5 | [Data-policy foundation and executor proof](./rbac-phases/PHASE-5-DATA-POLICY-FOUNDATION.md) | Approved semantics, feasibility evidence, and versioned policies; restricted users disabled |
| 6 | [Direct data protection](./rbac-phases/PHASE-6-DIRECT-DATA-PROTECTION.md) | Authorized queries, history, exports, and metadata; restricted users disabled |
| 7 | [Derived data, AI, and write-denial gates](./rbac-phases/PHASE-7-DERIVED-AI-WRITES.md) | Scope-preserving derived/AI/cache coverage and restricted-write denial; launch disabled |
| 8 | [Restricted-data release](./rbac-phases/PHASE-8-RESTRICTED-DATA-RELEASE.md) | Reviewed, measured enablement for supported configurations and surfaces |

This master backlog remains the source of truth for approved policies and
dependencies. Keep handoffs synchronized when reviewed decisions change;
the documents do not create new approvals or mark work complete. Phase 0
remains open, and Phases 5-8 remain planning-depth until DATA-00 semantics and
executor feasibility resolve. No document authorizes code changes, migration,
public exposure, or production enablement while its prerequisite gates are open.

### Readiness review and revised first-release scope

The [implementation-readiness ledger](./rbac-phases/IMPLEMENTATION-READINESS.md)
records the recursive dependency review, approved decisions, concrete data
fixtures, all 39 slice completion dependencies, and engineering contract gates.
The handoffs are ready for contract/design work, not certified ready to code
in full or ready to release. Engineering leadership should use the ledger's
[takeover recommendation](./rbac-phases/IMPLEMENTATION-READINESS.md#engineering-takeover-recommendation)
to assign named owners, close contract/proof gates, and admit slices to
implementation individually, the
[parent-to-slice mapping](./rbac-phases/IMPLEMENTATION-READINESS.md#parent-backlog-item-to-slice-mapping)
and [critical-path analysis](./rbac-phases/IMPLEMENTATION-READINESS.md#critical-path-and-achievable-parallelism)
to sequence and staff the work, and the
[glossary](./rbac-phases/IMPLEMENTATION-READINESS.md#glossary-of-load-bearing-terms)
for the security terms these documents rely on. Product decisions are not
feasibility evidence.

The user approved the following refinements on 28 October 2026; these supersede
earlier open alternatives or broader first-release scope in this plan:

- HelixDB-first, conditional on a bounded concurrency/atomicity proof; no
  additional database or silent fallback is approved.
- Password plus TOTP/recovery codes for privileged users. Enrollment precedes
  usable authority; password plus one-use recovery code revokes old sessions
  and allows only re-enrollment until a new factor is verified. No email-only
  MFA reset; exceptional recovery remains separately reviewed.
- Phase 1 owns minimal durable account-security audit primitives; Phase 3
  reuses/extends them for workspace lifecycle, reads, retention/export, and UI.
- Engineering owns reviewed endpoint/schema/library/transaction contracts;
  affected implementation waits for them and prerequisite proof.
- First-release policies use explicit per-subject grants and trusted attributes,
  typed equality/set-membership, AND within grants and OR row scopes across
  grants with an identical column allowlist per subject/dataset. No groups or
  arbitrary SQL; conflicting allowlists reject/deny rather than broaden.
- Workspace owners manage policies/assignments using `data_policies.manage`,
  browser-only with fresh reauthentication, durable audit and revision
  invalidation. The user explicitly accepted owner self-grant risk instead of
  two-person approval; this is not an implicit data-read bypass.
- Descendants are parent-bounded and not independently shareable. Saved outputs
  with unprovable current source access deny or recompute; recompute aggregates
  per reader. Broader aggregate sharing/declassification is deferred.
- Restricted subjects are read-only initially. DATA-06/SCOPE-05 implement
  explicit data-write denial; full row/column write enablement needs separate
  future approval. Safe read-only analysis/artifact persistence is not a
  blanket HTTP-POST exemption or prohibition; classify operation intent.
- Engineering proposes workload/numeric targets for product/operator approval
  before measurement/release assessment. No capacity numbers are approved.

Second-pass product clarifications are also approved:

- All human accounts/user API tokens in an isolation-enabled workspace are
  restricted/read-only for business data, including owners with every read
  grant. No per-user unrestricted-writer exemption or role/policy escape.
  Local/pre-isolation compatibility and reviewed narrow service authority are
  separate; never impersonate a human owner to run service writes.
- Manual jobs may survive ordinary browser logout/session expiry using explicit
  bounded one-job delegation. Issue it atomically at authenticated submission,
  bind original actor/workspace/credential kind/ID/ceiling, intent and inputs,
  and set immutable expiry no later than its deadline. C-04 must approve the
  numeric maximum, queue/retry/deadline rules and eligible privileged intents.
  No privilege refresh, reusable login, cross-job use, or service conversion.
- Current account/membership/grants/policy still constrain execution/commit.
  Cancellation, delegation expiry, disablement, rights loss, or originating
  API-token revocation/expiry stop affected work within 5 seconds. Normal
  logout/expiry ends session access/delivery, not valid independent delegation.
  Retrieval always needs current ordinary caller credentials and data scope.
- Password reset/change and verified email change revoke prior browser sessions
  and browser-origin job delegations; preserve valid API tokens/their jobs
  under current rights. Offer explicit cancel-my-active-jobs separately from
  logout. C-02/04 must settle MFA factor-event effects on existing delegations;
  no missing contract defaults to ongoing privileged authority.
- Global account disable is platform-admin-only, browser-only with password
  plus TOTP reauthentication within 5 minutes and durable audit. Reject any
  disablement leaving an active workspace without an active owner or removing
  the last active platform admin; transfer ownership first. Owners may remove
  workspace membership, not globally disable accounts. No self-service account
  deletion/emergency override is approved.
- Verified email change revokes old-address pending invitations when it commits.
  Notify the user to request a new invite; only an authorized workspace owner
  explicitly reissues to the verified new address. No automatic transfer or
  reissue; stable-ID memberships persist. Fence acceptance races.

The [lifecycle acceptance matrix](./rbac-phases/IMPLEMENTATION-READINESS.md#lifecycle-acceptance-matrix)
separates session delivery, browser-origin delegation and token-origin jobs.
It preserves the strict revocation/commit bound; it does not grandfather
unauthorized work or permit irreversible external effects without safe fencing.

## Current baseline

- Shared role type: `owner`, `editor`, `viewer` in
  [`packages/shared/src/index.ts`](../packages/shared/src/index.ts).
- Principal resolution, local-owner provisioning, workspace membership checks,
  role hierarchy, and token scope checks are in
  [`apps/api/src/app.ts`](../apps/api/src/app.ts).
- Routes pass a minimum role to `access()`, usually `viewer`, `editor`, or
  `owner`; many frontend screens also gate controls by role.
- API tokens are workspace-scoped, digest-stored, read-only by default, and
  manageable by owners in
  [`apps/api/src/routes/workspace.ts`](../apps/api/src/routes/workspace.ts).
- Some background operations re-check their actor's membership before
  sensitive work, including
  [`apps/api/src/jobs.ts`](../apps/api/src/jobs.ts) and
  [`apps/api/src/setup-jobs.ts`](../apps/api/src/setup-jobs.ts).
- There is no user login, logout, membership API, invitation API, or
  authenticated multi-person identity lifecycle. Existing tests assert that
  these routes do not exist in
  [`tests/api.test.ts`](../tests/api.test.ts).
- Security and deployment constraints are documented in
  [`README.md`](../README.md#security-model) and
  [`docs/GUIDE.md`](../docs/GUIDE.md#security).
- There is no identity-based row or column isolation within a workspace.
  Dataset query helpers operate on workspace-scoped snapshots, and Parquet
  export can stream the underlying snapshot directly. See
  [`apps/api/src/datasets.ts`](../apps/api/src/datasets.ts) and
  [`apps/api/src/routes/data.ts`](../apps/api/src/routes/data.ts).
- Sensitive-column flags control parts of hosted-AI context; they are not
  user data-access rules and do not restrict authorized preview, query, or
  export. See [`docs/API.md`](../docs/API.md).

## Product decisions and guardrails

The following product directions were agreed on 28 October 2026. Agreement
does not imply implementation, security sign-off, or completion of Phase 0.
Unresolved choices remain explicit gates.

1. **Collaboration and deployment direction — agreed; boundary review open:**
   plan an internet-reachable HTTPS application on cloud Kubernetes with
   invitation-only accounts. Database, executor, and model services remain
   private. This is future product direction, not authorization to expose the
   current local-only application. Before activation, define the operator,
   audience, workspace provisioning, and tenant/workspace isolation model.
   Review TLS/ingress and trusted-proxy handling, private internal services,
   secret management, persistent storage, backup/restore, abuse controls, and
   observability. Define session/revocation consistency across API replicas,
   migration coordination, and worker/job concurrency before scaling. The
   existing local-only deployment is not a cloud deployment blueprint.
2. **Identity and provisioning — revised decision:** use application-managed
   email/password accounts for the initial release, as selected on 28 October
   2026. This supersedes the earlier managed-OIDC recommendation; user
   credentials are not an OIDC provider. Keep account creation invitation-only,
   with an explicit initial-owner bootstrap procedure and no open
   self-registration. Use maintained password-hashing and session libraries,
   not a custom cryptographic implementation. Email verification, recovery,
   credential-abuse defenses, and account lifecycle are required release
   scope, not optional follow-ups. OIDC/SSO may be added later.
3. **Local mode compatibility — agreed:** support explicit local and
   collaborative modes. Preserve no-login local-owner behavior only for
   existing local-only installations. Cloud deployment must require
   collaborative mode and configured account/session security; invalid
   configuration must stop startup rather than fall back to local mode. Never
   silently turn an unauthenticated collaborative caller into an owner.
4. **Role semantics — agreed:** retain `viewer`, `editor`, and `owner` using
   the capability matrix below. Editors prepare changes; only owners publish
   definitions. Defer custom roles and a separate reviewer/publisher role.
   Route-level permission and resource checks still require RBAC-01.
5. **Session policy — agreed; implementation and measurement pending:** use
   server-controlled sessions, protected cookies, CSRF defenses, session
   rotation/revocation, and reauthentication for high-impact owner actions,
   including ownership transfer. Maximum session lifetime is 12 hours, idle
   timeout is 30 minutes, and privileged actions require reauthentication
   within the preceding 5 minutes. After revocation commits, subsequent
   authorization checks must deny access; ongoing streams/work must stop
   within 5 seconds, with no atomic-commit exception. Operations that cannot
   safely meet this bound remain disabled; a cancellation request alone is
   not proof that a commit stopped. Test these guarantees across replicas.
   Only explicit authenticated user interactions
   extend browser-session activity; background polling, SSE, keepalives, and
   API-token traffic never extend the idle deadline.
6. **Invitation identity binding — agreed:** deliver invitations by email,
   require a verified email match at acceptance, and bind membership to a
   stable internal user ID. Email is not the
   permanent identifier. Initially reject acceptance without the required
   verified email. After an email change, an outstanding invitation for the
   old address must be revoked/reissued to the new verified address; an
   existing membership remains bound to the stable identity.
7. **Data policy semantics — bounded first-release choices approved; proof open:**
   use default-deny per-subject dataset grants, trusted attributes, typed
   equality/set-membership, and one column allowlist per subject/dataset.
   Owners manage policy through audited, freshly reauthenticated browser
   operations; owner self-grant risk is explicitly accepted. No implicit
   owner read bypass, groups, or declassification. Restricted data writes
   deny in the first release. DATA-00 still requires exact C-05 contracts,
   executor feasibility, and approved budgets.
8. **Data-isolation rollout — agreed:** ship workspace RBAC and data
   isolation as separately identified milestones. Until isolation is released,
   do not place users with different data-access requirements in the same
   workspace or promise differentiated access. Restricted users remain
   disabled until every enabled surface is covered; unsupported surfaces deny
   access explicitly.
9. **Route authorization — agreed:** every API route has an explicit
   server-side access decision, with automated detection of unclassified
   routes. UI visibility is not authorization. Inventory resource ownership,
   streaming endpoints, and background effects as well as ordinary requests.
10. **Route mappings and credential ceiling — approved:** adopt the target
    permission mappings in [RBAC-ROUTE-POLICY.md](./RBAC-ROUTE-POLICY.md),
    including editor/owner grants for data management, record actions,
    pipeline execution, and analysis management, and owner-only publication
    and access-control audit reads. Membership/invitation, source/AI
    credential, and API-token administration require an authorized browser
    session; API tokens cannot perform those operations or actions requiring
    fresh reauthentication. Preserve narrower resource and credential checks.
11. **Private content — approved:** chats, runs, and saved results are private
    to their creator by default, with explicit workspace sharing. Workspace
    owners and platform administrators do not implicitly gain access to
    private content. Only the creator may change sharing or delete content,
    subject to existing operation permissions; readers cannot edit, resume,
    cancel, or reshare it. Follow the sharing and migration contracts below;
    no additional moderation authority is approved.
12. **Workspace provisioning — approved:** only platform administrators may
    create cloud workspaces. Platform administration is distinct from
    workspace ownership and does not imply access to workspace data. Define
    administrator provisioning/revocation and audited creation. Assign a
    verified active account as initial workspace owner atomically with
    creation; the creating platform admin receives no automatic membership.
    Do not infer platform authority from an owner membership.
13. **Account lifecycle — approved; MFA required for privileged users:** use the activation,
    bootstrap, password, recovery, and email-delivery contract below. Password
    reset revokes all existing browser sessions but preserves API tokens, as
    explicitly selected. A compromised API token therefore survives password
    reset until explicit revocation, expiry, account disablement, or loss of
    membership/grant. Document this consequence and provide token inventory
    and revocation guidance during recovery. Require MFA for platform admins
    and workspace owners before cloud launch using TOTP and recovery codes.
    Enrollment precedes privileged use; password plus recovery code allows only re-enrollment,
    revoking prior sessions. C-02 technical protocol and validation remain
    cloud release gates; no email-only reset.
14. **Migration and rollback — approved design:** use explicit operator
    mapping, legacy-token revocation, provenance-based private-content
    migration, and a maintenance cutover with verified backup as specified
    below. This approval defines future implementation requirements; it does
    not authorize running a migration, stopping services, restoring data, or
    revoking current credentials without separate operational approval.
15. **Platform administration and documentation — approved:** an existing
    platform admin may grant/revoke platform authority for verified active
    accounts through browser-only operations with recent reauthentication,
    audit, and transactional last-active-admin protection. This does not grant
    workspace membership or private-content access. In cloud mode, restrict
    API documentation, OpenAPI, and documentation assets to authenticated
    platform admins; minimal health and login/static shell remain explicitly
    public.
16. **Operational failures and acceptance budgets — approved direction:**
    fail closed when identity, session, or permission state cannot be verified.
    Privileged mutations require a durably committed audit record; mail
    failures leave activation/recovery pending with bounded retries and
    operator diagnostics. Require a declared representative workload and
    environment plus approved numeric budgets before benchmarking/release.
    Migration duration, authorization overhead, hashing capacity, and global
    mail capacity remain explicitly pending, not inferred production promises.

## Agreed authorization policy

Roles are presets mapped to named permissions. Route code should request a
permission, not compare ordinal role values. The effective permissions are the
intersection of the user's current workspace role and the credential's grant.
This only authorizes the operation. Data-access policies additionally constrain
which datasets, rows, and columns the operation may use. A "Yes" below does not
mean unrestricted access to workspace data.

| Capability | Viewer | Editor | Owner |
| --- | :---: | :---: | :---: |
| Read workspace, datasets, published assets, activity | Yes | Yes | Yes |
| Preview, export, and run read-only analysis | Yes | Yes | Yes |
| Ingest data, upload files, start source sync | No | Yes | Yes |
| Edit pipelines, ontology, and proposals | No | Yes | Yes |
| Manage dataset metadata/versions, record actions, saved analyses, and pipeline execution | No | Yes | Yes |
| Publish definitions | No | No | Yes |
| Configure source credentials and AI provider | No | No | Yes |
| Change dataset privacy policy or connection schedule | No | No | Yes |
| Manage members, invitations, and roles | No | No | Yes |
| Create, inspect, and revoke API tokens | No | No | Yes |
| Delete workspace or transfer ownership | No | No | Yes |
| Read access-control audit records | No | No | Yes |

Publication is owner-only because it changes the active workspace generation.
Any future extension to editors requires a separate product decision and
review-workflow tests, not a broadening of all editor rights.

Approved initial workspace permission names:

- `workspace.read`
- `workspace.delete`
- `workspace.transfer_ownership`
- `members.read`, `members.manage`
- `invitations.manage`
- `tokens.manage`
- `data.read`, `data.query`, `data.export`, `data.ingest`
- `source.sync`, `source.manage`, `source.credentials.manage`
- `definitions.edit`, `definitions.publish`
- `provider.manage`
- `privacy.manage`
- `data_policies.manage` (separate from hosted-AI sensitivity flags)
- `assistant.answer`, `assistant.build`
- `data.manage`, `records.write`, `pipelines.run`, `analysis.manage`
- `audit.read` (access-control audit, owner-only)

`data_policies.manage` is owner-only and requires a browser session,
reauthentication within 5 minutes, durable audit and revision invalidation.
Owners may explicitly grant themselves access under the accepted self-grant
risk; platform authority alone cannot manage workspace policies or read data.

The [route inventory](./RBAC-ROUTE-POLICY.md) records approved target mappings,
not shipped enforcement. Platform-only workspace creation is a separate
authority, not another workspace role. Role grants never override private
content, browser-only administration, or data-policy restrictions.

Keep the initial map small and route-oriented. Add a permission only when it
represents a distinct policy decision; do not create a large generic policy
engine or custom-role editor in the first release.

## Target design

### Principal and credential model

- Give each application account a stable internal user ID. Store verified
  email separately, with documented normalization and uniqueness rules;
  email changes must not change user IDs or transfer memberships.
- Hash passwords with Argon2id through a maintained implementation, using a
  unique salt and explicitly configured, benchmarked cost parameters. Never
  store recoverable passwords, return hashes, or log credentials.
- Keep account creation invitation-only. Bootstrap the initial platform admin
  using the one-time operator-controlled flow below, with no default password
  or unrestricted owner-claim endpoint. Apply the migration contract below
  and explicit initial workspace-owner assignment without automatic admin
  membership.
- Verify email ownership before invitation acceptance. Use digest-stored,
  expiring, single-use verification and recovery tokens; consume them
  atomically. Password recovery does not itself verify a changed email.
- Provide non-enumerating login/recovery responses and distributed,
  bounded account/IP throttling suitable for multiple API replicas. Do not
  turn account lockout into an easy permanent denial of service.
- Require current-password or approved recovery proof for credential changes;
  revoke existing browser sessions after password reset, and define account
  disablement, email-change verification, and owner-recovery behavior.
- Preserve API tokens after password reset; account disablement and explicit
  token revocation must still block them. Platform admins and workspace owners
  require password plus TOTP before cloud activation; recovery codes permit
  only re-enrollment, with prior sessions revoked. C-02 technical design is pending.
- Resolve browser requests from a server-controlled session. If cookie
  authentication is used, make the cookie `HttpOnly`, `Secure` in deployed
  environments, and an explicitly documented `SameSite` policy. Apply
  CSRF protections to every cookie-authenticated mutation.
- Keep browser sessions separate from developer API tokens. Do not accept an
  API token as a browser login session.
- Use a typed authenticated principal in request context instead of `any`
  identity values. The context should identify credential kind, user ID,
  session/token ID, and any token grant restrictions.
- In collaborative mode, missing, expired, malformed, or revoked credentials
  fail closed with 401. Authorization failures return 403; resources outside
  the caller's workspace can continue returning 404 to avoid confirming their
  existence.

### Approved account activation and recovery contract

These are approved product requirements, not implemented flows. All secret
links use cryptographically random tokens, digest-only durable storage,
purpose/subject binding, explicit expiry, and atomic single-use consumption.
Browser completion pages must not leak tokens into logs, analytics, or
referrers. GET/link prefetch must not complete account changes or consume the
only proof; a validated completion action performs the transition.

| Flow | Approved behavior | Required completion and failure checks |
| --- | --- | --- |
| Initial platform-admin bootstrap | An operator command issues a setup link valid for 30 minutes. Reissue is operator-only and invalidates earlier links. Recipient verifies email and sets a password. | Bootstrap closes atomically after completion, including across replicas. No public first-caller-wins endpoint, reusable setup secret, or implicit workspace-data access. An operator must handle a lost bootstrap link; ordinary requests cannot reopen bootstrap. |
| New-account activation | Invitation expires after 48 hours; a separate email-verification link expires after 30 minutes. Account activates only after both proofs and a valid password. | Bind both proofs to the intended identity; recheck invitation expiry/revocation at acceptance. Email verification alone grants no membership or platform authority. Verification pending does not permit login as an active user. |
| Existing-account invitation acceptance | Require authenticated account with verified email matching the invitation. | Consume invitation once and create membership atomically; preserve current identity/memberships. Committed email change revokes old-address pending invitations, including racing acceptance. Only an authorized owner explicitly reissues to the verified new address. |
| Password policy | Minimum 15, maximum 128 Unicode code points; allow spaces, paste, and password managers. No composition rules or periodic forced changes. Reject known-compromised/common passwords without sending raw passwords to third parties. | Never silently truncate or change passwords. Define encoding/input limits and the local compromised-password check before implementation. Apply the same rules to activation, change, bootstrap, and reset. |
| Password storage | Argon2id starting parameters: 64 MiB memory, 3 iterations, parallelism 1, per-password random salt, and versioned parameters through a maintained library. | Benchmark latency, peak memory, and bounded concurrent hashing on the intended runtime before release; these are starting parameters, not measured production capacity. Rehash obsolete parameters on successful login; never silently lower costs under load. No recoverable password storage. |
| Password recovery | Send a reset link only to verified email; 30-minute, digest-stored, single-use token. Return a generic response whether or not an eligible account exists. | Reset changes password and revokes all prior browser sessions/browser-origin delegations atomically or via a fail-closed security revision. No automatic login, account reactivation, membership or authority grant; valid API tokens/jobs remain constrained by current rights. |
| API tokens after reset | Preserve existing API tokens; do not silently revoke automation credentials during password recovery. | Token expiry, explicit revocation, account disablement, and current membership/grant restrictions still apply. Recovery guidance must state that resetting a password does not contain a stolen API token. |
| Email delivery | Configurable server-side SMTP; Gmail is the initial configuration using a dedicated sender and Google app password where supported, never the normal account password. | Configure secrets outside chat/source control. Use authenticated TLS delivery, bounded retry, and explicit operator-visible failures without leaking account existence to anonymous callers. Keep provider switching possible and validate Gmail eligibility, sending limits, and deliverability before cloud release. |
| Email identity and changes | Trim surrounding whitespace, lowercase the domain, preserve the local part, and initially match local parts exactly. Never strip Gmail dots or plus tags. Email changes require recent reauthentication, verification of the new address, and notification to the old address. | Use the same identity key for invitations, login, uniqueness, recovery, and rate-limit accounting; concurrent changes must enforce uniqueness. Document that case variants of a local part are not automatically equivalent. Define how ambiguous legacy identities are migrated rather than silently merging accounts. |
| Login abuse limits | At most 5 failed attempts per account per 15 minutes and 30 per IP per 15 minutes, with temporary throttling and generic responses; no permanent lockout. | Shared atomic counters across API replicas, approved proxy/IP handling, and bounded retention. Test window boundaries, concurrent failures, nonexistent identities, and attempts to bypass account/IP limits. Account throttling still has denial-of-service risk; validate behavior before release. |
| Recovery/verification email limits | At most 3 per account per hour and 20 per IP per hour, plus a deployment-wide sending cap set after Gmail capacity validation. | Enforce before enqueue/sending across replicas; retries must not bypass the cap. Define counter retention, window semantics, and resend behavior before implementation. Do not reveal account existence through response content or rate-limit behavior. |
| Browser-session activity | Only explicit authenticated user interactions update last activity. Polling, SSE, keepalives, and API-token traffic do not. | Enforce the 30-minute idle deadline and 12-hour absolute deadline across replicas. Classify requests explicitly; do not treat an untrusted client flag as proof of user interaction or let reauthentication extend the absolute lifetime silently. |

Password change and committed verified-email change also revoke prior browser
sessions/browser-origin delegations, with valid API-token jobs preserved under
current rights. Global disablement requires platform-admin browser authority,
fresh password plus TOTP and durable audit, with active-owner/admin invariants
across all workspaces. Phase 1 builds revision/authority hooks using fixtures;
Phase 3 integrates the real lifecycle routes without backwards dependencies.

Use a deterministic test mail sink instead of real SMTP delivery in automated
tests. Email-queue storage must protect pending secret links and have bounded
retention; digest-only token records do not make a plaintext delivery queue
safe. Loss of verified-email access has no public recovery bypass: an audited
operator recovery procedure still needs design and approval before cloud
launch. Privileged TOTP/recovery-code policy is selected; technical protocol,
secret encryption, replay/abuse controls and verification still block release.
Compromised-password screening implementation, throttle window/retention
semantics, request activity classification, and Gmail capacity validation also
remain implementation/release gates. Do not improvise an unauthenticated
administrator recovery bypass.

### Approved migration, ownership, and rollback contract

This contract applies only when an operator explicitly activates collaborative
mode. Existing installations staying in local-only mode are not silently
migrated, signed out, or stripped of tokens.

| Area | Approved behavior | Required safeguards and validation |
| --- | --- | --- |
| Local-owner identity | Operator explicitly maps the existing local user ID to one verified password account, preserving the existing user and workspace IDs. | No email-only matching, automatic account merging, or first-login owner claim. If a distinct verified account ID already exists, block on the collision until an explicit reviewed reconciliation design is available; do not silently rewrite references. Preserve existing memberships rather than reasserting owner roles on each request. |
| Workspace data and credentials | Preserve workspace IDs, datasets, versions, memberships, encrypted source/provider credentials, and their required encryption key. | Validate referential integrity and decryptability without exposing secrets. Preserve human/service actor provenance; do not invent new administrative authority for the mapped local account. |
| Legacy API tokens and sessions | Revoke legacy API tokens and local sessions at collaborative cutover. Users sign in and recreate narrowly granted tokens. | Old credentials must fail after activation, including after process restart or replica cache refresh. Provide user-visible automation migration guidance. This is separate from the policy preserving valid API tokens after a later password reset. |
| Private legacy content | Retain a verified legacy creator's ownership. Assign unattributed local content to the explicitly mapped local owner only where provenance establishes that ownership; otherwise quarantine it from collaborators pending operator review. | Do not treat workspace/platform administration as a content-read grant. Quarantine applies to direct IDs, generic resources, activity, search, shared links, and stored results. Define a review workflow with explicit audited access; review does not itself declassify or share content. |
| New cloud workspace ownership | Platform admin explicitly chooses a verified active initial owner in the workspace-creation operation; owner assignment and creation are atomic. | Creation cannot leave an ownerless workspace. The creating admin gets no automatic membership or data access. Handle concurrent account disablement/owner assignment with fail-closed validation; enforce last-owner invariants thereafter. |
| Cutover | Explicit maintenance cutover, verified backup, versioned idempotent migration, and validation before serving collaborative users. Revoke local sessions and legacy API tokens as part of activation. | Block old and new processes from serving against partially migrated state. Define exclusive migration coordination, resumable checkpoints, failure diagnostics, and encrypted-credential validation. No request-time migration that automatically grants ownership. |
| Rollback | Require separately approved compatible code plus the matching backup and preserved encryption configuration. Never silently re-enable no-login access on a shared deployment. | Rehearse restore and isolation before release; document maintenance duration, post-backup data loss, and credential resurrection risks. Restored local-only data must remain isolated from collaborative clients until a safe access boundary is explicitly established. Do not promise an in-place schema downgrade. |

These are approved migration rules, not a tested migration implementation.
Precise maintenance targets, collision reconciliation, quarantine review,
cross-store atomicity/coordination, and rollback operations still require
implementation design and rehearsal under RBAC-04. Never include secrets or
private content in migration reports or audit metadata.

### Approved sharing and platform-administration contract

| Area | Approved behavior | Required safeguards and validation |
| --- | --- | --- |
| Sharing audience | Creator may explicitly share chats, runs, and saved results read-only with current workspace members as a whole. No public links, cross-workspace sharing, or selected-member audiences initially. | Default private; validate current membership, resource ownership, operation permission, and reader data policy on every retrieval. Children are parent-bounded and not independently shared. Deny/recompute saved output with unprovable current source access; sharing is not declassification. |
| Content control | Creator alone changes sharing or deletes content, subject to existing operation permissions. Shared readers cannot edit, resume, cancel, or reshare it. | Enforce through direct APIs, generic resources, followups, exports, cached results, live sessions, and job controls, not just UI. Sharing does not grant editor operations to viewers; private creator ownership also does not bypass role permissions. |
| Unsharing | Block subsequent reads after committed unsharing and stop ongoing streams within the approved 5-second revocation bound. | Reauthorize stored results and cached responses. Previously delivered/downloaded content cannot be recalled; explain this limitation in UI/docs. Resolve descendants and linked artifacts consistently without implicit sharing. |
| Creator departure | If creator is removed from the workspace or their account is disabled, quarantine their private and shared content from remaining members. No automatic transfer or owner/admin read access. | Hide through all alternative retrieval surfaces and revoke in-flight delivery. No automatic unquarantine or resharing on rejoin/reactivation. Audited recovery/review remains a separate unapproved operator procedure. |
| Platform authority lifecycle | Existing platform admin grants/revokes platform authority for verified active accounts using browser-only actions and reauthentication within 5 minutes. | Audit actor/target/result without secrets; protect the last active admin transactionally, including concurrent revocation, disablement, and deletion. Recheck current authority before commit; no API-token administration or implicit workspace-data access. |
| Cloud documentation | Only authenticated platform admins may access API docs, OpenAPI, and plugin documentation assets. | Test direct schema URLs, asset routes, redirects, HEAD, caches, ordinary workspace owners, and revoked admins. Public static shell/health exceptions must not bypass documentation checks. Local-only behavior is independently preserved and tested. |

Implement sharing and platform-authority enforcement under RBAC-03, audit
recording under RBAC-08A/RBAC-08, and end-to-end rollout checks under RBAC-09.
If audit persistence is not yet available, keep admin mutations disabled;
Phase 2 may deploy their policy plumbing without enabling those operations.
Exact endpoint contracts, quarantined-content recovery, descendant graph/
provenance implementation, account reactivation, and emergency last-admin recovery still need
design; none is permission for an implicit content-access or admin bypass.

### Final Phase 0 decision package and release evidence

This table consolidates the remaining gates; it does not mark implementation,
benchmarks, security review, or Phase 0 complete.

| Area | Approved design direction | Remaining decision or evidence | Backlog/release gate |
| --- | --- | --- | --- |
| Cloud trust boundary | Future internet-reachable HTTPS app, invitation-only accounts, private database/executor/model services; local mode never serves shared cloud users. | Named operator, reviewed ingress/TLS/proxy and network boundaries, isolation, secrets/storage, migration and worker coordination, backup/restore, incident response, and security sign-off. No cloud resources or network exposure are authorized here. | RBAC-00 design approval; RBAC-09 operational review before cloud activation. |
| Identity/session/policy outage | Do not grant access when current identity, session, or permission state cannot be verified; never fall back to local owner. | Dependency-specific error/alert contracts and tests, cross-replica invalidation, and retry/idempotency design. No stale positive authorization fallback on dependency failure. | RBAC-02, RBAC-03, RBAC-07, RBAC-09. |
| Audit persistence failure | Deny privileged mutations unless their audit record can be durably committed. | Atomic mutation/audit or equivalent durable transaction/outbox design; no success response or privileged side effect based solely on an in-memory audit queue. Address crash recovery and retries without duplicate effects. | RBAC-08A/RBAC-08 before privileged mutations are enabled. |
| Mail delivery failure | Activation/recovery stays pending, with bounded retries and operator-visible diagnostics; anonymous responses do not enumerate users. | Protected queue, retry/expiry behavior, Gmail deliverability/capacity, and mail-failure tests. SMTP acceptance alone is not proof of mailbox delivery. | RBAC-02; cloud capacity evidence under RBAC-09. |
| Revocation and atomic commits | Subsequent checks deny after committed revocation; ongoing work/streams must safely stop within 5 seconds, with no atomic-commit exception. | Prove effective cancellation/commit fencing and outcome consistency at race boundaries. Operations that cannot meet the bound remain disabled; do not silently grandfather publication or equate sending cancel with stopping a database commit. | RBAC-07 execution and RBAC-09 verification. |
| Exceptional recovery/moderation | No self-service lost-email/last-admin bypass or content moderation/transfer feature in the first release. No automatic unquarantine/resharing after rejoin/reactivation. | Separately reviewed operator procedure with explicit approval and audit for any exceptional recovery, including lost-email/last-admin cases. No implicit content-read or role grant through operator status. | Procedure review before cloud launch; implementation only if separately approved. |
| Performance and migration budgets | Declare the representative workload/environment and approve numeric budgets before benchmark execution and release assessment. | Dataset/workspace/user scale, concurrent requests/hash jobs, replica/resources, baseline, percentile/error criteria, migration-duration target, authorization overhead, hashing capacity, and global-mail cap. Record both targets and measured results; do not invent values without evidence. | RBAC-00 budget approval; RBAC-02/RBAC-04/RBAC-09 measurements. |
| Privileged MFA | Password plus TOTP/recovery codes; enrollment before usable owner/admin authority; recovery permits only re-enrollment and revokes sessions. | Review C-02 parameters, encrypted secret/key lifecycle, replay/skew/abuse controls and code rotation; implement/test. No email-only reset; exceptional recovery separately reviewed. | RBAC-02 design/implementation; cloud release blocker. |

Implementation evidence belongs to the phase that builds the capability:
RBAC-03 owns the automated registration guard, RBAC-04 owns migration rehearsal,
and RBAC-09 owns release verification. Phase 0 still needs the outstanding
design approvals and numeric budgets; recording downstream tests as pending
must not be confused with requiring all implementation before planning closes.

### Membership and role model

- Keep membership workspace-scoped; each membership identifies one user, one
  workspace, and one validated role.
- Centralize role-to-permission mapping and access evaluation.
- Resolve membership on each request (or use a cache with explicit,
  immediate-enough invalidation) so removal and downgrade revoke access without
  waiting for long-lived tokens to expire.
- Fail closed on unknown roles, malformed membership data, missing workspaces,
  deleting workspaces, and credential/workspace scope mismatches.
- Preserve the invariant that every active workspace has at least one owner.
  Prevent removal or demotion of the last owner in the same transaction that
  changes membership.

### API tokens

- Preserve one-time raw token display and digest-only authentication storage.
- Treat a token grant as a ceiling, not an independent identity: effective
  rights are the intersection of token grants and the user’s current
  membership permissions.
- Retain the current read-only choice initially by mapping it to a grant set;
  optionally add explicit expiry and last-used metadata.
- Enforce workspace scope, expiry, revocation, and current membership on every
  request. Revoking a user or changing their role must also constrain their
  existing tokens.
- Never include raw tokens, token digests, session secrets, or invitation
  secrets in logs or inventory responses.
- Deny API-token access to membership/invitation, source/AI credential, and
  API-token administration, even for an owner's token. Require authorized
  browser sessions and fresh reauthentication where specified.

### Background work

- Authenticate and authorize when an operation is requested.
- Issue bounded one-job delegation for durable manual work, with original
  credential/intent/input ceiling and immutable expiry no later than deadline.
  Normal browser logout/session expiry ends session delivery but not valid
  delegated execution; no job delegation authenticates retrieval or callbacks
  requiring a live browser. Current account/rights/policy are still mandatory.
- Password/email security changes revoke browser-origin delegations; valid
  token-origin jobs remain bounded by originating token expiry/revocation.
  Add explicit authorized job cancellation separately from logout. C-04 owns
  numeric maximum/deadline and fencing contracts before feature coding.
- Persist actor identity and the required permission or operation intent with
  durable work where needed.
- Re-check current membership and authorization before privileged side
  effects, especially publication, provider configuration, source credential
  writes, and ownership-sensitive changes.
- Define revocation behavior: queued privileged work must not start after
  access is revoked; running work must stop before an uncommitted privileged
  effect. There is no atomic-publication exception: if safe cancellation and
  commit fencing cannot meet the 5-second revocation bound, keep the affected
  collaborative operation disabled until redesigned and validated.
- Do not infer authorization from a stale role captured when a job was queued.

### Within-workspace data isolation

Use RBAC for operations and attribute-based data policies for their scope:

```text
Authenticated principal
  -> workspace membership and operation permission
  -> current dataset grant and trusted subject attributes
  -> mandatory row filtering and column projection
  -> authorized query inputs
  -> authorized output, export, or persisted result
```

For example, two editors may both query orders, but one sees assigned regions
without customer email, while another sees all regions with financial columns.
Do not create a workspace role for every region/department combination.

**Policy contract**

- Bind each policy to a stable dataset ID, action, subject user, typed row
  predicate, column allowlist, and revision. Groups/inherited grants are deferred.
- Source attributes such as assigned account IDs or regions from trusted
  server-managed assignments or explicitly approved identity claims. Never
  accept security attributes from request bodies or model output.
- Conditions are AND-combined within a grant; OR row scopes across grants
  only when their column allowlists are identical for the subject/dataset.
  Reject conflicting authoring; deny malformed/stale conflicting policy.
  Never independently union all rows and columns.
- Use typed equality/set-membership, not arbitrary SQL. C-05 defines exact
  types/null/error/metadata behavior and final DATA-00 acceptance.
- No applicable grant, missing required attributes, an empty column allowlist, unknown
  policy fields, or an invalid policy means deny with an explicit error.
- Version policies independently of immutable data snapshots. Apply current
  policy to historical versions; missing predicate columns deny access, not
  disable filtering. New columns are not automatically granted.
- Keep authorization policies separate from sensitivity hints and masking.
  Start by omitting denied columns; display masking alone does not authorize
  queries against their original values.

**Executor enforcement**

Resolve policy in a shared API data-access layer, not independently in every
handler. Pass a validated internal authorization plan to the executor, bound
to principal, action, workspace, dataset/version, and policy revision.
Client-facing payloads must not be able to supply or override that plan.

The executor currently loads snapshots into tables before running user SQL
([`engine.ts`](../services/executor/src/engine.ts)). Materialize only authorized
rows and columns into the relations available when untrusted SQL executes.
Remove raw staging relations first and retain external-access restrictions;
an accessible raw table behind a filtered view is not sufficient.

- Compile a small typed predicate language with safely bound values and
  validated identifiers; never accept arbitrary policy SQL or concatenate
  client values into predicates.
- Apply policy before joins, aggregates, sorting, limits, and user filters.
  Do not append a security predicate to final SQL or merely strip output
  columns after computation.
- Treat user-requested filters as additional restrictions, never as the
  mandatory access policy.
- All aliases must resolve only to authorized relations. Test schema/catalog
  discovery, alternate query forms, errors, and raw-relation references.
- API tokens inherit current data restrictions and may narrow them, never
  broaden them. A read-only token does not imply access to every readable row.

**Coverage contract**

| Surface | Required enforcement |
| --- | --- |
| Preview, SQL, historical snapshots | Query authorized inputs using current policy |
| CSV and Parquet export | Generate filtered/projected output; no direct raw snapshot download for restricted callers |
| Catalog, profiles, samples, statistics | Expose only authorized metadata and values; do not reuse global samples or counts |
| Ontology records and graph | Filter objects, properties, edges, search, traversals, and counts, including direct IDs |
| Pipelines and derived datasets | Preserve restrictions through lineage; deny unclassified outputs |
| Dashboards and Home metrics | Recompute for the reader; broader shared aggregates/declassification deferred |
| AI and voice | Limit schema, samples, retrieved context, queries, results, errors, and persisted transcripts |
| Saved queries, answers, job files | Reauthorize retrieval and sharing; do not reuse another principal's broader result |
| Edits, actions, ingestion | Deny restricted-subject data writes before effects; fine-grained write enablement deferred |

Ontology materialization must retain enough provenance or stable authorization
attributes to evaluate access. If that cannot be established, deny access to
that derived resource rather than treating its new ID as an access grant.

**Writes and derived data**

First-release restricted subjects are read-only: deny ingestion, inserts,
edits, overlays, reverts, relationship mutations, generated data actions, and
bulk writes before effects. DATA-06 implements these gates, not full write
enablement. Future enablement requires separately approved editable fields,
old/new row checks, endpoint checks, atomic bulk and revision rules.
An operation permission such as `data.ingest` alone is never data authorization.
Every human account/user token in an isolation-enabled workspace is restricted,
including full-read-grant owners. No role, policy update, client flag, or new
token creates a human write exemption. Local/pre-isolation mode and explicit
reviewed service writers are separate, never a fallback for failed policy.

Restricted inputs produce restricted outputs by default. Global materialization
may run under explicit service authority, but its results cannot be served
under that authority to ordinary readers. Broader sharing/declassification is
deferred and must deny in this release. Row/column controls alone do
not prevent statistical inference; approved aggregate views or suppression
rules may be needed instead of arbitrary analytics for sensitive use cases.

**Revocation and persisted results**

Cache identities must include workspace, input versions, query, policy
revision, and effective-access fingerprint (including relevant subject
attributes). Reauthorize saved results and downloads; partitioning caches is
not a substitute for checking current access.

Invalidate access on membership, attribute, token, or policy changes.
Check revisions at sensitive execution/retrieval boundaries and reject or
recompute stale work. Define a measurable revocation guarantee for streams
and in-flight work, not just for newly submitted requests. Previously delivered
data cannot be recalled.

## Delivery backlog

Items are sequenced by dependency. IDs are stable references for planning and
issue creation; they do not imply that work is already scheduled.

## Production rollout phases

These phases group the backlog into independently testable release increments.
The phase number is a rollout aid, not a replacement for the item dependencies
or acceptance criteria below. A phase is deployable only when its exit criteria
pass; a feature gate must keep incomplete capabilities disabled. Production
deployment must remain within the approved trust boundary from RBAC-00.

### Phase 0 status — in progress

Product direction is agreed, including future cloud Kubernetes hosting,
invitation-only application-managed passwords, explicit local compatibility,
owner-only publication, verified invitation binding, and a separate
data-isolation release. Phase 0 is **not complete**. The following evidence is
still required:

- [x] Select the base authentication approach: application-managed
      email/password accounts; OIDC provider selection is not required for
      this release.
- [x] Approve password rules, invitation/verification/reset lifetimes,
      one-time operator bootstrap, Gmail through configurable SMTP, and
      preservation of API tokens after password reset.
- [x] Approve Argon2id starting parameters (64 MiB, 3 iterations, parallelism
      1), account/IP abuse thresholds, email identity/change rules, and
      explicit-interaction-only session activity.
- [ ] Validate hashing capacity, compromised-password screening, throttle
      window/retention and activity classification; approve loss-of-email
      operator recovery, Gmail cloud suitability/global sending cap, and
      C-02 TOTP/recovery-code technical protocol.
- [x] Select TOTP/recovery-code policy, HelixDB proof-first, early security
      audit primitives, and engineering-owned technical contract gates.
- [ ] Approve the written cloud trust boundary and operator responsibilities;
      the Kubernetes direction alone is not deployment/security sign-off.
- [x] Select future internet-reachable HTTPS with invitation-only accounts and
      private internal services, subject to a separate reviewed cloud design.
- [x] Approve session limits: 12-hour maximum, 30-minute idle timeout,
      5-minute reauthentication freshness, and 5-second in-flight revocation
      bound with no atomic-commit exception.
- [x] Require MFA for platform admins and workspace owners before cloud launch.
- [x] Approve fail-closed identity/session/permission behavior, durable-audit
      requirements for privileged mutations, and pending/retried mail failures.
- [ ] Declare workload/environment and numeric budgets, and finalize detailed
      dependency-failure/retry contracts. Workload/capacity is currently unknown;
      no provisional production capacity targets are approved.
- [x] Approve local-owner mapping with preserved IDs, legacy-token/local-session
      revocation at cutover, provenance-based private-content handling, and
      maintenance/backup/rollback constraints.
- [ ] Complete migration implementation design and rehearsal under RBAC-04,
      including collisions, quarantine review, coordination, and failure recovery.
- [x] Inventory current API routes and draft permission/resource checks in
      [RBAC-ROUTE-POLICY.md](./RBAC-ROUTE-POLICY.md).
- [x] Approve target route mappings, private-by-default content, owner-only
      access-control audit, browser-only sensitive administration, and
      platform-admin-only cloud workspace creation.
- [x] Require atomic assignment of a verified active initial workspace owner;
      the creating platform admin receives no automatic membership.
- [x] Approve workspace-wide read-only sharing, creator-only content control,
      quarantine on creator removal/disablement, audited browser-only admin
      management with last-active-admin protection, and admin-only cloud docs.
- [x] Exclude self-service exceptional recovery and content moderation/transfer
      from the first release; no automatic unquarantine or resharing.
- [x] Approve parent-bounded non-independent descendants; no broader
      aggregates/declassification; read-only restricted scope and audited
      owner policy management with explicitly accepted self-grant risk.
- [ ] Finalize descendant graph/provenance contracts and separately reviewed
      operator recovery procedures. Implement unclassified-route detection under
      RBAC-03; its design is recorded, not yet implemented.

These are decision and inventory deliverables, not requirements to implement
all authentication or Kubernetes infrastructure in Phase 0. Detailed data
policy semantics remain gated by DATA-00 and do not block workspace RBAC.

| Phase | Scope | Release and exit gate |
| --- | --- | --- |
| **0 — Decisions and route inventory** | RBAC-00, RBAC-01 | Approve the deployment boundary, identity and provisioning model, local-mode behavior, permission matrix, and route inventory. No collaborative access is enabled. |
| **1 — Authentication foundation** | RBAC-02 | Password accounts, verification/recovery, abuse defenses, sessions, CSRF, and explicit mode selection pass tests. Deploy with collaboration disabled; missing or invalid collaborative configuration fails closed. |
| **2 — Workspace authorization and compatibility migration** | RBAC-03, RBAC-04 | Every route in the inventory has a server-side policy; role/permission, cross-workspace, migration, backup/restore, and denial-before-side-effect tests pass. Do not enable collaboration with any unclassified route. |
| **3 — Audited membership and token lifecycle** | RBAC-08A, RBAC-05, RBAC-06, RBAC-08 | Establish audit recording first, then ship membership and token mutations with complete event coverage. Invitation, ownership, membership-change, token-scope, and audit-redaction tests pass. Enable only behind the collaboration gate. |
| **4 — Background authorization and workspace-RBAC pilot** | RBAC-07, RBAC-09 | Async revocation, security review, migration rehearsal, operational readiness, and required checks pass. Pilot workspace RBAC behind an explicit configuration/feature gate. This release does not provide row/column isolation. |
| **5 — Data policy foundation and executor proof** | DATA-00, DATA-01, plus a bounded DATA-02 feasibility prototype | Approve policy semantics and verify the executor can expose only authorized relations to untrusted SQL. Keep restricted-user access disabled; do not treat prototype results as a production control. |
| **6 — Direct data surfaces** | DATA-02, DATA-03 | Mandatory policy enforcement covers queries, previews, history, exports, metadata, profiles, and samples. Unsupported paths deny access. Restricted users remain disabled until all later phases pass. |
| **7 — Derived data, AI, and write-denial gates** | DATA-04, DATA-05, DATA-06 | Derived assets, AI, caches, async results, and explicit restricted-write denial pass tests. Fine-grained write enablement deferred; restricted launch remains disabled. |
| **8 — Restricted-data release** | DATA-07 | End-to-end coverage, migration, rollback, security review, performance results, and documentation pass. Enable restricted access only for the explicitly supported surfaces and policy configurations. |

### Phase 1–8 expected outcomes

This is the outcome-oriented view of the implementation breakdowns below.
All outcomes are **planned, not completed**. Each phase adds to the preceding
validated capabilities; deploying disabled code is distinct from enabling it
for users. Phase 0 approvals and the original backlog dependencies still
apply. Nothing here authorizes exposing the current local-only application.

#### Phase 1 — A verifiable identity for every collaborative request

- **Expected outcome:** invitation-only password accounts can activate, verify
  email, sign in/out, recover access, and maintain browser sessions. Privileged
  accounts have the approved MFA flow; local mode remains explicit and intact.
- **Completion evidence:** activation/recovery tokens are single-use; session
  tests prove the 12-hour maximum, 30-minute idle timeout, and 5-minute
  reauthentication freshness. CSRF, abuse controls, revocation, and dependency
  outages cannot produce an authenticated local-owner fallback.
- **Production boundary:** authentication may deploy with collaboration
  disabled. No public hosting, collaborative onboarding, or migration is
  enabled. C-02 TOTP/recovery technical protocol remains a blocker for AUTH-07.

#### Phase 2 — Consistent workspace and resource authorization

- **Expected outcome:** every registered route enforces current identity,
  workspace membership, operation permission, credential ceiling, and resource
  visibility. Private content stays creator-private unless explicitly shared;
  owners/platform admins gain no implicit private-content access. A validated
  migration preserves mapped IDs and credentials while revoking legacy access.
- **Completion evidence:** role/credential and cross-workspace matrices pass;
  unclassified routes are detected; denied requests cause no business side
  effects. Migration reruns/interruption and backup/restore rehearsals prove
  integrity, quarantine, and legacy-token/session revocation.
- **Production boundary:** collaboration remains disabled. Actual maintenance
  cutover needs separate operational approval; unaudited admin mutations stay
  disabled until Phase 3.

#### Phase 3 — Auditable administration without privilege escalation

- **Expected outcome:** authorized browser users can manage invitations,
  memberships, ownership, platform authority, and allowed API-token grants.
  Privileged mutations have durable, redacted audit records; concurrent
  changes cannot remove the last owner or last active platform admin.
- **Completion evidence:** invitation expiry/replay/identity-binding,
  concurrent lifecycle changes, token grant ceilings, and UI/API parity pass.
  Audit failure prevents privileged success. Removed/downgraded members lose
  access; password reset preserves tokens, unlike legacy cutover revocation.
- **Production boundary:** lifecycle features can deploy disabled, with durable
  audit installed first. Collaborative-user rollout waits for Phase 4.

#### Phase 4 — A controlled workspace-RBAC pilot

- **Expected outcome:** synchronous requests, jobs, callbacks, streams, and
  result delivery enforce current authority throughout their lifecycle.
  Operators can run a reviewed pilot with tested monitoring and recovery.
- **Completion evidence:** revocation at queue, execution, delivery, and commit
  boundaries safely stops affected work within 5 seconds. Migration/outage
  drills, security review, required checks, and declared workload-budget
  measurements pass. Operations unable to meet the bound remain disabled.
- **Production boundary:** workspace RBAC may be enabled for an approved pilot.
  This is not row/column isolation. Cloud exposure independently requires
  privileged MFA, reviewed infrastructure/security, and operator sign-off.

#### Phase 5 — An approved and technically feasible data-policy model

- **Expected outcome:** dataset, row, and column policy semantics are approved;
  versioned policies and trusted subject assignments can resolve effective
  access. An isolated executor proof demonstrates authorized inputs without
  exposing raw relations to untrusted SQL.
- **Completion evidence:** same-role users with disjoint/overlapping grants
  have explicit expected results; missing/conflicting policy denies access.
  Synthetic tests attempt raw-table/catalog/hidden-column bypasses and record
  executor resource behavior before production enforcement is committed.
- **Production boundary:** policy infrastructure may deploy with restricted-user
  access disabled. The prototype is feasibility evidence, not a production
  security control; DATA-00 and feasibility conclusions gate later design.

#### Phase 6 — Policy-correct direct reads, exports, and metadata

- **Expected outcome:** queries, previews, historical versions, CSV/Parquet
  exports, schemas, profiles, samples, statistics, and counts reveal only
  currently authorized rows, columns, and metadata.
- **Completion evidence:** exact output rows/columns match approved fixtures
  across browser/token credentials and old/new schemas. Filtering/projection
  occurs before untrusted SQL; raw snapshot shortcuts, client-supplied plans,
  stale plans, and metadata bypasses fail. Stream revocation is verified.
- **Production boundary:** direct-surface protections can deploy incrementally,
  but restricted users remain disabled until Phases 7–8 pass. Unsupported
  paths deny access rather than returning unrestricted data.

#### Phase 7 — Restrictions survive derivation, AI, caching, and writes

- **Expected outcome:** pipelines, ontology/graph, dashboards, AI/voice, saved
  results, caches, and asynchronous artifacts preserve effective data scope.
  Restricted-subject data writes explicitly deny; fine-grained write enablement
  is deferred beyond the first restricted-data release.
- **Completion evidence:** materialization/sharing never broadens access;
  broader aggregate sharing/declassification denies. AI receives only authorized
  context. Broader-user caches cannot serve narrower readers. Scope-changing
  writes and bulk operations deny before effects; policy races and revocation
  tests pass.
- **Production boundary:** restricted-data launch remains disabled. Unprotected
  derived, AI, retrieval, or write surfaces must be explicitly denied, not
  treated as exceptions to the policy layer.

#### Phase 8 — A reviewed restricted-data production release

- **Expected outcome:** users with the same workspace role can safely receive
  different dataset/row/column access across every enabled supported surface,
  with documented configurations and operational ownership.
- **Completion evidence:** reconciled route/artifact coverage and end-to-end
  tests assert exact data and artifact contents, including isolation,
  revocation, schema changes, and failure cases. Security review, migration/
  restore drills, measured workload-budget results, documentation, and release
  sign-off are recorded.
- **Production boundary:** enable restricted users only for validated policy
  configurations and surfaces through controlled rollout. Rollback/containment
  may disable features but must never remove authorization protections.
  Independent cloud-launch gates still apply.

Before Phases 1–4 are enabled in production, owners must set measurable
acceptance targets for session lifetime, revocation latency (including
in-flight work and streams), migration duration, and authorization overhead.
The targets and observed results belong in the release record; unresolved
targets block rollout rather than defaulting to an unmeasured guarantee.

Operational acceptance must also specify and test behavior when the
account/credential store, email delivery service, session store, audit writer,
or policy resolver is unavailable; when
an authorization plan is stale; and when a client retries a failed mutation.
Authentication and policy failures must fail closed. Privileged mutations are
denied unless their audit record can be durably committed. Define how operators
distinguish configuration errors from dependency outages and which retries are
idempotent. Mail failures leave activation/recovery pending with bounded
retries and safe diagnostics. Do not silently downgrade to local-owner behavior.

### RBAC-00 — Approve collaboration and trust boundary

**Priority:** P0, product/security gate  
**Depends on:** none

**Work**

- Confirm collaboration is an intended product capability.
- Document supported deployment and network exposure boundaries for the agreed
  future cloud Kubernetes direction; obtain explicit security approval before
  exposure or multi-user hosting.
- Finalize the selected application-password design, account-provisioning
  model, session policy, local-mode compatibility, and role semantics for
  publication.
- Define migration and rollback constraints for current installations.
- Set measurable targets for session lifetime, revocation latency, migration
  duration, and authorization overhead; define operational failure and retry
  behavior for account, email-delivery, session, and audit dependencies.

**Acceptance criteria**

- Product and security owners approve a written trust boundary.
- Account security, email verification/recovery, abuse controls, and user
  lifecycle are decided.
- The initial-owner provisioning flow is selected; invitation-only account
  creation does not leave bootstrap ownership undefined.
- Existing local installations have an explicit compatibility/migration path.
- Measurable rollout targets and dependency-failure behavior are approved
  before production enablement.
- No documentation suggests that the current local-only deployment is safe to
  expose to a network.

### RBAC-01 — Establish the permission catalog and route policy matrix

**Priority:** P0  
**Depends on:** RBAC-00

**Work**

- Approve named permissions and role grants using the matrix above.
- Inventory all authenticated API routes, including nested and streaming
  routes, and assign each an explicit permission.
- Identify resource-specific checks, such as ownership of a thread/run,
  token-workspace matching, and active-generation visibility, that cannot be
  represented by role membership alone.
- Record deliberate exceptions and public/health/OpenAPI endpoints.
- Maintain the initial inventory in
  [RBAC-ROUTE-POLICY.md](./RBAC-ROUTE-POLICY.md). Its current-check columns
  describe inspected code; target mappings have product approval, while the
  explicitly listed remaining details still require decisions before migration.

**Acceptance criteria**

- A route-policy inventory covers every route under `/api/v1`.
- Every route has an explicit access decision; no undocumented implicit
  default remains for mutation endpoints.
- Product approves publication, export, owner administration, and assistant
  permissions.
- Tests or a static route registration pattern make missing policy
  assignments detectable.

### RBAC-02 — Add the authentication and session foundation

**Priority:** P0  
**Depends on:** RBAC-00

**Work**

- Implement invitation-only account activation, email verification,
  password login/change/recovery, account disablement, and the approved
  platform-admin bootstrap. Follow the approved account activation and
  recovery contract, including exact token lifetimes. Do not add open
  registration.
- Persist stable user IDs, verified email and normalized uniqueness keys,
  Argon2id password hashes with versioned parameters, and server-controlled
  sessions. Keep authentication secrets out of generic resource APIs.
- Implement login, session status, logout/revocation, session rotation,
  digest-stored single-use verification/reset tokens, and atomic consumption.
- Add non-enumerating responses, distributed abuse controls, safe recovery,
  and the approved privileged-user MFA policy. Benchmark password hashing
  under expected concurrent load and enforce bounded request/resource limits.
- Implement configurable SMTP with Gmail as the initial configuration, a
  deterministic test mail sink, protected pending mail, bounded retries, and
  explicit delivery-failure diagnostics. No hardcoded sender secrets.
- Apply CSRF protection to session-authenticated state-changing requests.
- Add explicit behavior for missing credentials in collaborative versus
  single-user mode.
- Redact passwords, hashes, session cookies, and invitation/verification/reset
  secrets from logs; do not put credentials in frontend configuration.

**Acceptance criteria**

- Incorrect passwords, unverified/disabled accounts, expired/replayed recovery
  tokens, and activation without valid invitation/bootstrap authority are
  rejected. Only the approved invitation/bootstrap flow can create an active
  account.
- Verification, reset, and email-change races enforce uniqueness and single
  use; reset revokes all existing browser sessions while preserving API
  tokens. Disabled accounts remain denied for both credential kinds.
  Recovery never grants workspace membership or ownership by itself.
- Tests cover the 15/128-code-point password boundaries, spaces and Unicode,
  forbidden silent changes, compromised-password rejection, exact
  48-hour/30-minute token expiry boundaries, cross-purpose token rejection,
  link prefetch, bootstrap reissue, concurrent bootstrap closure, and Gmail
  delivery failures through a test transport.
- Login/recovery do not enumerate accounts, account/IP limits work across
  replicas, and hashes/secrets are absent from API output and logs.
- Tests exercise the approved 5-account/30-IP failed-login thresholds over
  15 minutes and 3-account/20-IP recovery/verification mail thresholds over
  an hour, including boundary expiry and concurrent replicas. Record hashing
  latency, peak memory, and concurrency capacity for the starting parameters;
  limit saturation must not silently reduce hash cost.
- Email identity tests cover whitespace, domain case, exact local-part case,
  Gmail dots/plus tags, uniqueness races, new-address verification, old-address
  notification, and no public loss-of-email recovery bypass.
- Browser polling, SSE, keepalives, and token activity cannot postpone the
  30-minute idle expiry; explicit user interactions cannot exceed the 12-hour
  maximum. Request activity classification is enforced by server policy.
- Sessions expire and can be revoked; logout prevents further use.
- Browser mutations without valid CSRF/origin protection are rejected.
- Collaborative mode never grants local-owner identity to an unauthenticated
  request.
- Tests cover activation, login success/failure, hashing/rehash, email
  verification/change, recovery, abuse limits, session fixation/rotation,
  expiry/revocation, CSRF, redaction, and concurrent single-use tokens.

### Phase 1 implementation breakdown — planning only

These slices refine RBAC-02; they are not new independent release approvals
or permission to begin authentication code. RBAC-00 remains the prerequisite.
Prepare/review contracts while gates are open; do not bypass them by shipping
partially protected collaborative access. Each slice must preserve local-mode
behavior and keep authentication/collaboration features gated until validated.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| AUTH-01 — Contracts and persistence design | Typed accounts, credentials, sessions, proofs, revisions/modes and API contracts; minimal durable account-security event primitive design/proof. | Approved account lifecycle; review existing store/transaction patterns. | HelixDB proof for uniqueness, one-use transitions, invariant/audit atomicity and invalidation across independent clients/processes; secret exclusion. | C-01/02 engineering contracts and reviewed libraries; failed proof requires a new architecture decision, not a local-lock fallback. No dependency installation yet. |
| AUTH-02 — Password and identity primitives | Argon2id hashing/verification/rehash, 15–128-code-point validation, email identity normalization, token digest/expiry/purpose helpers. | AUTH-01 contracts and reviewed library choices. | Unicode/password boundaries, email aliases/case, invalid hash handling, digest secrecy, exact expiry, single-use races. | Encoding limits, screening source/update policy, bounded hash concurrency; production workload and capacity budgets unknown. |
| AUTH-03 — Mail and abuse-control foundation | Configurable SMTP/Gmail transport, protected mail queue and test sink, atomic account/IP counters and bounded retries. | AUTH-01 persistence and proof-token contract; AUTH-02 identity normalization. | No real mail in tests; delivery faults, generic responses, concurrent limits, replay/retry caps, secret redaction, expired queued links. | Counter window/retention, trusted proxy/IP design, queue protection, Gmail eligibility/global cap and load validation. |
| AUTH-04 — Bootstrap and activation | Operator bootstrap, invitation proof validation, independent email verification and password activation; one-time consumption with durable security events. | AUTH-01, AUTH-02, AUTH-03; atomic persistence and early audit primitive. | 30-minute bootstrap/verification and 48-hour invitation boundaries, reissue invalidation, disabled/unverified accounts, concurrent bootstrap closure, no public owner claim. | C-02 public endpoint/CSRF/link-token design. No completed Phase 3 audit dependency; production invitation issuance remains RBAC-05, fixtures supply proofs for Phase 1 tests. |
| AUTH-05 — Browser sessions and CSRF | Login/status/logout, opaque sessions and rotation, 12-hour maximum/30-minute idle expiry, explicit activity classification and 5-minute reauthentication. | AUTH-02; AUTH-03 login throttling; active-account state from AUTH-04. | Session fixation, cookies/CSRF, generic login failure, background activity exclusions, revoked/disabled identity, multi-replica invalidation and outage denial. | Cookie/SameSite details, activity classification, durable revocation and concurrency design. Do not modify the current local-owner path without mode regression coverage. |
| AUTH-06 — Recovery and account maintenance | Password/email changes revoke prior browser sessions/delegations; preserve valid token-origin authority; old-email invitation invalidation hooks and disablement checks. | AUTH-01, AUTH-03, AUTH-05. | Reset/email races, no automatic login, browser-delegation fencing, token/job current rights, owner-only invitation reissue, disablement/invariant fixtures. | C-02/03 security revision and platform-admin disable integration; last-active-owner/admin atomicity and durable audit. No self-service exceptional recovery. |
| AUTH-07 — Privileged MFA | Password plus TOTP, verified enrollment before privilege, encrypted factor secrets, digest recovery codes, and re-enrollment-only recovery with prior-session revocation. | AUTH-01/05/06; reviewed authority contracts/fixtures coordinated with RBAC-03/05, not future lifecycle implementation. | Counter replay/skew/races, abuse, code one-use, secret redaction, restricted recovery, assurance/promotion and no password-only privileged bypass. | C-02 protocol/secret-key/rotation/recovery details pending; method is selected. No email-only reset; cloud release needs implemented/measured enforcement. |
| AUTH-08 — Integration and dark deployment | Login/account UI, SDK/OpenAPI updates, endpoint policy inventory, documentation, redaction/fault tests, and local-mode regression. | Relevant AUTH slices, route contracts and RBAC-00 design approval. | Focused API/browser tests, typecheck/test/build per repository guidance, deterministic mail sink, dependency/security review and recorded measurements. | Deploy only with collaboration disabled. Phase 1 does not authorize public hosting, RBAC migration, invitation administration, or restricted-data access. |

AUTH slices may be developed incrementally only after prerequisite approvals;
their numbering does not replace the explicit dependencies above. The
password-account activation endpoints are bounded proof-based flows, not
general unauthenticated account writes. API-token authentication must remain
separate from browser sessions.

Before code begins, approve C-01/02 persistence/API/library contracts and
the selected TOTP/recovery technical protocol. Phase 1 owns durable account-
security primitives; Phase 3 extends them without a backwards dependency.
Publication/job cancellation is
primarily RBAC-07, not a reason to weaken the Phase 1 session revocation
contract: affected later operations stay disabled if they cannot safely meet
the strict bound. Unknown workload, migration/performance budgets, cloud
trust-boundary sign-off, and Gmail capacity remain explicitly pending.

### RBAC-03 — Centralize permission evaluation and migrate API routes

**Priority:** P0  
**Depends on:** RBAC-01, RBAC-02

**Work**

- Define typed `Permission`, principal, role-grant, and credential-grant
  types in the shared/API model as appropriate.
- Replace numeric role ordering and ad hoc `access(req, minRole)` checks with a
  central `requirePermission`/`authorize` helper.
- Migrate all API route modules using the RBAC-01 route inventory.
- Validate role and membership data at read/write boundaries; fail closed for
  unknown values.
- Keep workspace membership, token scope, deletion state, and
  resource-specific checks in the authorization path.
- Keep frontend controls aligned with the policy, but continue to enforce all
  decisions on the server.
- Implement creator-private and explicit workspace-read-only sharing,
  creator-only controls, unsharing revocation, and departure quarantine across
  dedicated/generic endpoints and persisted results.
- Add explicit platform-admin authorization, browser-only reauthenticated
  grant/revoke actions with last-active-admin protection, and cloud
  documentation guards. Keep admin mutations disabled until audit is wired.

**Acceptance criteria**

- The route inventory maps directly to policy declarations in code.
- The full role × permission table has positive and negative tests.
- Cross-workspace, deleting-workspace, malformed-role, and invalid-token
  requests fail closed.
- Unauthorized API mutations return 403 even if the client submits them
  directly.
- Existing intended behavior remains covered by regression tests.
- Shared readers cannot modify, resume, cancel, reshare, or delete content.
  Quarantined/unshared content is unavailable through direct IDs, generic
  resources, caches, feeds, and streams; revocation meets the approved bound.
- Concurrent admin demotion/account disablement cannot remove the last active
  admin. Non-admins, API tokens, stale reauthentication, and revoked admins
  cannot mutate platform authority or access cloud documentation.

### RBAC-04 — Migrate existing installations and preserve local mode

**Priority:** P0  
**Depends on:** RBAC-02, RBAC-03, RBAC-00

**Work**

- Implement the approved migration/ownership contract with a versioned,
  idempotent migration for local identity, memberships, private content,
  tokens, and sessions. Require explicit operator mapping to a verified
  account; block ambiguous identity collisions.
- Preserve user/workspace IDs, data, memberships, actor provenance, encrypted
  credentials, and the encryption key. Revoke legacy API tokens and local
  sessions at collaborative cutover; do not migrate them into broad grants.
- Add provenance-based private-content ownership and quarantine unresolved
  content across every retrieval surface, including generic resources.
- Implement maintenance gating and exclusive migration coordination, verified
  backup, failure recovery, pre-service validation, and separately approved
  rollback with compatible code and matching backup.
- Prevent routine request-time provisioning from reasserting owner
  memberships over team-managed roles.
- Implement the approved explicit single-user compatibility mode or migration
  path.
- Provide startup validation and actionable errors when deployment
  configuration is incomplete.

**Acceptance criteria**

- Migration can run repeatedly without duplicating users or memberships.
- Existing user/workspace IDs and data are unchanged; encrypted credentials
  remain readable with the preserved key without logging secret values.
- Legacy API tokens and local sessions fail after collaborative activation,
  including across replicas/restarts, with user-visible migration guidance.
  Installations remaining local-only retain intended existing behavior.
- Private legacy content is visible only to its established creator; ambiguous
  content is quarantined from collaborators through all alternative endpoints.
- Identity collisions, interrupted migrations, repeated execution, concurrent
  startup, partial-store updates, and rollback are tested on representative
  data. No process serves partially migrated collaborative state.
- A team member's downgraded/removed role is not overwritten by local bootstrap.
- Backup/restore and rollback behavior is documented and tested before
  enabling the migration by default.

### RBAC-05 — Implement member and invitation lifecycle

**Priority:** P1  
**Depends on:** RBAC-02, RBAC-03, RBAC-04, RBAC-08A

**Work**

- Add owner-authorized APIs to list members, issue/revoke invitations, change
  roles, remove members, and transfer ownership.
- Bind invitation acceptance to an authenticated identity; store only a
  digest of the invitation secret.
- Enforce single use, expiry, revocation, and verified identity binding.
- Enforce last-owner and ownership-transfer invariants transactionally.
- Add member management UI with confirmation for destructive or privileged
  changes.
- Add audit events for invitation and membership lifecycle actions.

**Acceptance criteria**

- A viewer/editor cannot list or modify membership or create invitations.
- Expired, replayed, revoked, and identity-mismatched invitations are rejected.
- No operation can leave an active workspace without an owner.
- Role changes and removals take effect on the next authorized request.
- UI and API both enforce the intended behavior; API checks are independently
  tested.

### RBAC-06 — Align API-token grants with memberships

**Priority:** P1  
**Depends on:** RBAC-03, RBAC-04, RBAC-08A

**Work**

- Define token grant sets and map the existing `readOnly` option to a
  least-privilege permission set.
- Optionally add expiry and last-used fields after confirming product needs.
- Re-check current user membership and token grant intersection per request.
- Ensure member removal/downgrade constrains all that member's tokens
  immediately.
- Keep raw tokens one-time display and digest-only storage; preserve opaque
  revocation handles.
- Update SDK types, OpenAPI schemas, and Developer tools UI.

**Acceptance criteria**

- Read-only tokens cannot execute any permission outside their grant set,
  even through direct API calls.
- A token cannot cross its workspace boundary.
- Expiry, revocation, role downgrade, and member removal all deny access.
- Token inventory does not expose secrets or authentication digests.
- SDK and API tests cover the supported grant behavior.

### RBAC-07 — Enforce authorization at background side-effect boundaries

**Priority:** P1  
**Depends on:** RBAC-03, RBAC-04

**Work**

- Inventory durable jobs, assistant runs, scheduled work, live sessions, and
  callbacks that act on behalf of a user.
- Persist actor and operation intent where authorization must be re-evaluated.
- Re-check current permissions immediately before privileged writes or
  publication.
- Define cancellation/commit behavior for revocation during running jobs.
- Close or constrain user-bound live sessions after logout, removal, or
  workspace access loss.

**Acceptance criteria**

- Queued privileged work does not start after its actor loses the required
  permission.
- Sensitive side effects do not rely solely on stale enqueue-time role data.
- Revocation tests cover queued, running-before-commit, and already-committed
  work.
- System/service jobs that intentionally have no human actor have an explicit,
  narrowly scoped service authority and regression tests.

### RBAC-08A — Establish the access-control audit foundation

**Priority:** P1  
**Depends on:** RBAC-03

**Work**

- Extend Phase 1's durable account-security primitive with the workspace
  lifecycle audit contract; do not make Phase 1 depend on this later item.
- Define the audit event shape and reliable, redacted recording path before
  membership or token lifecycle mutations are enabled.
- Provide the same foundation before platform-admin grant/revoke actions
  are enabled; record sharing changes and quarantine lifecycle without content.
- Decide access, retention, and export policy for audit records.
- Ensure denied attempts can be recorded without leaking credentials or
  generating unbounded sensitive data.

**Acceptance criteria**

- The event contract, persistence path, failure behavior, and redaction rules
  are tested before RBAC-05 or RBAC-06 is enabled.
- No raw credentials, cookies, tokens, or invitation secrets are recorded.
- Audit read access follows an explicitly approved permission.

### RBAC-08 — Complete access-control audit coverage

**Priority:** P1  
**Depends on:** RBAC-03, RBAC-05, RBAC-06, RBAC-08A

**Work**

- Provide event hooks for invitations, acceptance, role changes, member
  removal, ownership transfer, token creation/revocation, and sensitive
  privileged changes.
- Cover platform-admin grant/revoke actions, sharing/unsharing, and departure
  quarantine without recording private content or secret links.
- Ensure denied attempts can be recorded without leaking credentials or
  generating unbounded sensitive data.

**Acceptance criteria**

- Every membership and token lifecycle mutation creates an audit event before
  that mutation is enabled in production.
- Audit entries identify the actor and affected workspace/resource.
- No raw credentials, cookies, tokens, or invitation secrets are recorded.
- Audit read access follows an explicitly approved permission.

### RBAC-09 — Complete security, UI, and rollout verification

**Priority:** P0 release gate  
**Depends on:** RBAC-02 through RBAC-08

**Work**

- Add table-driven API authorization tests and focused browser tests.
- Review every route against RBAC-01 and every async effect against RBAC-07.
- Test migration on representative existing data with backup and restore.
- Run dependency and security review of password accounts, recovery,
  verification, abuse defenses, and session integration.
- Define deployment monitoring, staged rollout/disable procedures, and
  operator diagnostics for identity, authorization, audit, and migration
  failures.
- Update the API docs, security model, user guide, and operations runbook.
- Roll out behind an explicit feature/configuration gate if staged adoption is
  needed.

**Acceptance criteria**

- `pnpm typecheck`, `pnpm test`, and `pnpm build` pass; relevant browser tests
  pass in CI.
- Automated coverage includes unauthenticated, expired, revoked, cross-
  workspace, every role × permission, membership change, token, invitation,
  and async-revocation cases.
- Existing local-only behavior is either preserved and tested or has an
  approved migration with user-facing guidance.
- Operators can configure identity safely without putting client secrets in
  frontend code or logs.
- Operators can detect dependency failures and disable collaborative mode
  without silently changing caller identity or losing workspace data.
- Docs state exactly which deployment modes are supported and what access
  controls protect each mode.
- This milestone is workspace RBAC only. It must not be described as providing
  row/column isolation; that claim requires DATA-07 below.

## Data-isolation backlog

These items extend, rather than replace, RBAC-00 through RBAC-09. All are
required gates for enabling differentiated within-workspace data access; P0
here does not imply implementation before their prerequisites.

### DATA-00 - Approve data-access policy semantics

**Priority:** P0  
**Depends on:** RBAC-00, RBAC-01

**Work:** finalize the bounded per-subject read-only contract: trusted attributes,
typed equality/set-membership, identical column allowlists with OR row grants,
owner-managed audited policy, parent-bounded sharing, reader aggregates, and
revocation. Groups, declassification, and restricted-write enablement are deferred.

**Acceptance criteria**

- Two users with the same workspace role have explicit examples of different
  permitted rows and columns.
- Default deny, conflicting-allowlist rejection, schema evolution, audited owner
  administration/self-grant risk, and deferred declassification are documented.
- Measurable data-policy revocation and query/export performance targets,
  failure behavior, and operator diagnostics are approved.
- A bounded executor feasibility prototype demonstrates that authorized
  relations can be materialized without leaving accessible raw relations for
  untrusted SQL; prototype code is not treated as production enforcement.
- No owner or service-account bypass is implicit.

### DATA-01 - Implement versioned policies and trusted subject assignments

**Priority:** P0  
**Depends on:** DATA-00, RBAC-02, RBAC-03, RBAC-04

**Work:** add validated policy/attribute schemas, persistence, revisioning,
management APIs and UI, and a shared effective-policy resolver. Authorize
administration through owner-only `data_policies.manage`, browser-only with
fresh reauthentication; audit/revision updates are durable and invalidate work.
Explicit owner self-grant risk is accepted; no implicit read bypass.

**Acceptance criteria**

- Query/model payloads cannot set security attributes/plans. Authorized owners
  manage trusted assignments only through the audited control-plane path.
- Missing grants/attributes, conflicting assignments, unknown columns, and
  malformed policies fail closed with actionable errors.
- Migration never invents broad grants for new collaborators; preserved local
  access is explicit and tested.

### DATA-02 - Enforce mandatory policies in executor inputs

**Priority:** P0  
**Depends on:** DATA-01

**Work:** extend the API/executor contract with validated authorization plans;
compile predicates and column projections into authorized input tables before
executing untrusted SQL. Preserve existing file/network restrictions.

**Acceptance criteria**

- Joins, CTEs, aliases, subqueries, aggregates, and `SELECT *` cannot access
  denied rows or fields, including using denied fields only in predicates.
- No raw staging relation or alternate file/catalog path exposes protected
  data when user SQL runs.
- Missing or stale plans and missing predicate columns explicitly deny access.
- Representative large-snapshot tests verify existing executor memory,
  timeout, and spill limits remain respected; record performance impact.

### DATA-03 - Secure direct reads, exports, and metadata

**Priority:** P0  
**Depends on:** DATA-02, RBAC-06

**Work:** route preview, historical snapshots, SQL, CSV/Parquet export, profiles,
samples, and metadata through the common policy layer. Remove raw-file
shortcuts for restricted callers.

**Acceptance criteria**

- Both export formats contain exactly the allowed rows/columns.
- Current, pending, and historical snapshots apply current authorization.
- Counts, samples, schema descriptions, statistics, and errors do not expose
  forbidden values or denied column metadata under the approved policy.
- Browser and API-token access have equivalent data restrictions.

### DATA-04 - Propagate policy through ontology and derived assets

**Priority:** P0  
**Depends on:** DATA-03

**Work:** preserve provenance/authorization attributes across pipelines,
materialized records, relationships, dashboards, and metrics. Recompute under
reader policy; children remain parent-bounded and not independently shareable.

**Acceptance criteria**

- Direct record IDs, search, graph traversal, links, and counts obey row and
  property policies.
- Renamed/derived resources do not acquire broader access automatically.
- Users cannot read global aggregates or persisted outputs solely because
  they can open a dashboard or workspace.
- Unclassified derived assets deny or recompute from provable authorized input;
  broader shared aggregates/declassification deny in this release.

### DATA-05 - Enforce policies for AI, caches, and asynchronous work

**Priority:** P0  
**Depends on:** DATA-04, RBAC-07

**Work:** restrict model context, voice sessions, generated queries, cached
answers, result files, and transcripts. Bind work to effective access, and
reauthorize before execution and delivery.

**Acceptance criteria**

- A broader user's cache entry, chat, job result, or transcript cannot be
  returned to a narrower user.
- Policy/attribute changes invalidate access and stale results; revocation
  meets the DATA-00 guarantee for queued work, streams, and downloads.
- AI output and model/tool errors do not reveal denied data; local AI is
  subject to the same authorization as hosted AI.

### DATA-06 - Deny restricted data writes; defer fine-grained write enablement

**Priority:** P0  
**Depends on:** DATA-04

**Work:** explicitly deny restricted-subject data-changing intents across inserts,
ingestion, overlays, updates/reverts, generated/direct actions, relationships,
bulk and resumed jobs. Preserve intentional local/unrestricted behavior.
Full editable-column and old/new-row write policies require future approval.

**Acceptance criteria**

- Restricted editors/owners cannot change data through direct APIs, generated
  actions, ingestion, relationship paths, retries, or resumed jobs.
- Mixed/bulk requests deny before unauthorized business/file/job/external
  effects; no partial data writes.
- Read-only SQL/answer/artifact persistence follows reviewed privacy/data
  controls; classify operation intent rather than HTTP method.
- Future write enablement needs separate editable-field, old/new-row, endpoint,
  atomic bulk/idempotency and revision contracts. It is not complete here.

### DATA-07 - Verify and release within-workspace isolation

**Priority:** P0 release gate  
**Depends on:** DATA-03, DATA-04, DATA-05, DATA-06, RBAC-08, RBAC-09

**Work:** audit all enabled data surfaces against the coverage contract,
automate isolation tests, validate migration/revocation/performance, and update
user/API/operations documentation.

**Acceptance criteria**

- Same-role users with disjoint and overlapping grants pass end-to-end tests
  across every enabled surface.
- No unprotected alternate path remains; unsupported surfaces are denied
  explicitly before restricted users are enabled.
- Policy management and data decisions have safe audit records without protected
  payloads; declassification and restricted data writes explicitly deny.
- Typecheck, tests, build, and relevant browser tests pass; security review and
  measured revocation/performance results are recorded before release.

## Phase 2–8 implementation breakdowns

These slices refine the existing RBAC/DATA items, using the same structure as
Phase 1. They are planning specifications, not shipped capabilities, completed
approvals, or authorization to implement/deploy while prerequisite gates are
open. Phase 0 remains a decision checklist. Original item dependencies and
acceptance criteria remain mandatory; slice numbering does not create
dependencies between otherwise independent work.

Phases 2–4 provide concrete implementation scope for the agreed policies.
Phases 5–8 remain at planning depth until DATA-00 semantics and executor
feasibility are established; do not turn unresolved data-policy assumptions
into implementation commitments. New endpoints must be added to the
[route-policy inventory](./RBAC-ROUTE-POLICY.md) as designed. Its 83-route
baseline describes current registrations, not a permanent route count.

### Phase 2 — Workspace authorization and compatibility migration

**Backlog coverage:** RBAC-03, RBAC-04.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| ACCESS-01 — Authorization core | Typed permission/role grants, credential ceilings, platform authority, and shared resource authorization helpers. | RBAC-00/RBAC-01 approvals; RBAC-02 authenticated principal/session contracts. | Full role × permission × credential matrix; unknown roles, disabled accounts, deleting workspaces, and unverifiable authority fail closed. | Final persistence/invalidation contracts and allowed token grant sets; no implicit platform-to-workspace authority. |
| ACCESS-02 — Route enforcement | Migrate the full route inventory, including conditional intents, generic resources, browser-only administration, and registration guards. | ACCESS-01; approved route mappings. | Every current/new route declares a policy; stale/missing inventory entries detected; denial before jobs, files, outbound credential use, or business writes. | Keep unclassified routes and incomplete collaborative paths disabled; integrate resource-specific checks from ACCESS-03/04 before enabling. |
| ACCESS-03 — Private-content enforcement | Creator ownership, explicit workspace-read-only sharing, creator-only controls, unsharing, and departure quarantine across dedicated/generic endpoints. | ACCESS-01; approved sharing contract and resource model. | Direct IDs, search, feeds, caches, descendants, and streams cannot bypass privacy; readers cannot edit/resume/cancel/reshare/delete; revocation within 5 seconds. | Descendant-sharing and audited quarantine/recovery procedures remain open; no implicit owner/admin access or automatic resharing. |
| ACCESS-04 — Platform and documentation guards | Platform-admin-only workspace creation, atomic verified initial-owner assignment, admin-management policy plumbing, last-active-admin protection, and cloud documentation guards. | ACCESS-01; RBAC-02 session/reauthentication; approved platform lifecycle. | No automatic admin membership/data access; concurrent admin/owner changes fail safely; docs/schema/assets/HEAD deny ordinary or revoked users. | Admin mutations stay disabled until ADMIN-01 durable audit and ADMIN-03 lifecycle integration; MFA/cloud review still required before cloud launch. |
| ACCESS-05 — Migration and cutover | Operator local-user mapping, preserved IDs/encrypted credentials, legacy-token/session revocation, provenance-based quarantine, maintenance coordination, and rollback procedure. | ACCESS-01 through ACCESS-04 integrated under RBAC-03; RBAC-02; approved migration contract. | Repeat/interruption/collision and concurrent-start tests, referential integrity/decryptability, revoked credentials after restart, generic-route quarantine, and backup/restore rehearsal. | Maintenance budget, reconciliation/coordination implementation, and restore validation remain pending; actual cutover/rollback needs separate operational approval. |

**Deployment gate:** incremental releases preserve local-only behavior and keep
collaboration disabled. Do not activate migration before authentication,
complete authorization, backup, and rollback validation. Policy plumbing does
not authorize unaudited admin mutations or public hosting.

### Phase 3 — Audited membership and token lifecycle

**Backlog coverage:** RBAC-08A, RBAC-05, RBAC-06, RBAC-08.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| ADMIN-01 — Durable audit foundation | Extend Phase 1 security-event primitives for workspace lifecycle, authorized reads, retention/export, and UI. | Completed RBAC-03: ACCESS-01 through ACCESS-04. RBAC-08A is parent coverage, not a completion prerequisite. | Audit outage denies privileged mutations; crash/retry proves no unaudited success/duplicate effects; no secret/private-content logging. | Reviewed C-03 durable consistency and retention; in-memory buffering is insufficient. |
| ADMIN-02 — Invitations and membership | Owner/browser-authorized invitation issuance/revocation, acceptance integration, member listing, role changes, removal, and departure quarantine. | ADMIN-01; RBAC-02 activation; RBAC-03/RBAC-04 and their required migration validation. | 48-hour expiry, verified identity binding, replay/races, non-owner/token denial, downgrade/removal revocation, and quarantine without ownership transfer. | Exact endpoint/transaction contracts; no email-only identity or removal path bypassing last-owner protection. |
| ADMIN-03 — Ownership and platform administration | Audited ownership transfer, platform grant/revoke and platform-admin global disable; fresh browser password plus TOTP and current authority. | ADMIN-01, ADMIN-02, ACCESS-04; RBAC-02 verified accounts/reauthentication. | Concurrent workspace creation/owner assignment/demotion/disablement cannot eliminate last active owner/admin; owners cannot globally disable; no implicit content access. | C-03 cross-workspace invariant/security-revision/audit atomicity; ownership transfer before conflicting disable. No self-service deletion/emergency override. |
| ADMIN-04 — API-token lifecycle | Explicit allowed grant sets, current-membership intersection, digest-only issuance, opaque inventory/revocation, SDK/OpenAPI/UI integration. | ADMIN-01; RBAC-03/RBAC-04; approved browser-only sensitive administration ceiling. | Token cannot administer members/credentials/tokens, cross workspaces, or exceed current role; test expiry/revocation/removal and secret exclusion. | Exact grant/migration contract; distinguish cutover revocation from password-reset preservation. Preserve one-time raw display. |
| ADMIN-05 — Lifecycle UI and audit completion | Confirmation/error states, permission-aware controls, token recovery guidance, and complete RBAC-08 event coverage including sharing/quarantine/admin actions. | ADMIN-02 through ADMIN-04; ACCESS-03 sharing hooks. | Browser/direct-API parity, authority changes while a page is open, safe failures, actor/target audit coverage, and secret/private-content redaction. | Complete SDK/docs and authorized audit access; hide/disable controls whose server behavior is incomplete. |

**Deployment gate:** establish durable audit before enabling privileged
mutations. Features can deploy disabled on existing local installations;
collaborative-user rollout still requires Phase 4. An API/UI implementation
alone is not evidence that concurrent invariants or revocation work.

### Phase 4 — Background authorization and workspace-RBAC pilot

**Backlog coverage:** RBAC-07, RBAC-09.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| ASYNC-01 — Actor and service authority | Atomically issue bounded job-specific delegation with actor/workspace/original credential ceiling/intent/inputs/deadline; separate service and live-session authority. | RBAC-03/RBAC-04; ACCESS-01; approved service-job intent contracts. | Normal browser logout/expiry permits valid execution but no session delivery/retrieval; no cross-job/login/service reuse, grant escalation or implicit owner authority. | C-04 numeric delegation maximum/deadline, retry/queue and privileged-intent rules, security/factor-event effects, and legacy queue migration. |
| ASYNC-02 — Execution and commit enforcement | Current authorization at dequeue/retry/intent/side-effect/commit; delegation fencing and explicit cancel-my-jobs distinct from logout. | ASYNC-01, ADMIN-01; approved strict revocation contract. | Browser security changes revoke browser jobs; token/delegation expiry/revoke stops affected work; ordinary logout survival versus current-authority loss; pre/during/post-commit races within 5 seconds. | No atomic-commit exception; immutable deadline and original ceiling; unsafe external effects stay disabled. Sending cancel is not completion proof. |
| ASYNC-03 — Streams and live-session revocation | Current access checks and termination for SSE, CSV/Parquet downloads, provider/model streams, voice sessions, and protected result delivery. | ASYNC-01; ACCESS-03 resource visibility; session/token revocation contracts. | Logout, removal, disablement, unsharing, token/grant changes, replica delay, and dependency outage during delivery; meet 5-second bound. | Define cancellation/cleanup and measurable delivery boundaries; already-delivered data cannot be recalled. |
| ASYNC-04 — Release evidence and pilot | Integrated authorization tests, migration rehearsal, dependency/security review, metrics/alerts, operational failure drills, and pilot enable/disable procedures. | ASYNC-02/03; RBAC-02 through RBAC-08 complete; required project/browser checks. | Approved role/credential/route matrix, deterministic auth/mail/browser tests, backup/restore, audit failures, cancellation races, and workload-budget results. | MFA, reviewed cloud trust boundary, capacity/mail evidence, and operational sign-off remain required; no public pilot by implication. |

**Deployment gate:** enable a workspace-RBAC pilot only after all enabled
operations meet authorization, audit, and revocation criteria. Public cloud
activation is separately gated by MFA, infrastructure/security review, and
operator readiness. Do not claim row/column isolation at this milestone.

### Phase 5 — Data-policy foundation and executor proof

**Backlog coverage:** DATA-00, DATA-01, bounded DATA-02 prototype.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| POLICY-01 — Policy semantics | Candidate bounded per-subject read-only grants, typed predicates, uniform column allowlists, audited owner management/self-grant risk, parent-bounded sharing; no groups/declassification. | DATA-00 design prerequisites RBAC-00/RBAC-01; approved workspace/private-content principles. | Same-role exact fixtures; missing/malformed/conflicting policy denies; no implicit owner/service bypass. | C-05 exact semantics, approved budgets and POLICY-02 evidence before final DATA-00 approval. |
| POLICY-02 — Executor feasibility proof | Bounded isolated prototype exposing only authorized relations to untrusted SQL, with staging removed and external-access restrictions preserved. | Candidate semantics from POLICY-01 and synthetic policy/input fixtures; no production restricted users. | Raw tables, hidden-column predicates, catalogs, aliases, joins, schema changes, and representative memory/spill/timeout behavior. | Review feasibility before completing DATA-00 and before broad administration UI work; prototype does not satisfy DATA-02 production enforcement. |
| POLICY-03 — Versioned persistence and resolver | Validated per-subject grants/attributes, revisions, effective resolver and invalidation; no groups initially. | POLICY-02, ACCESS-05 and final DATA-00 approval. DATA-01 is parent coverage, not a prerequisite of itself. | Missing/stale/malformed/conflicting policy/attributes, historical schemas, revision races and deny-by-default migration. | C-05 revision/fingerprint/atomic update design; no invented broad grants. |
| POLICY-04 — Policy administration and audit | Owner-only browser policy/assignment management with fresh reauthentication, durable audit and revision invalidation. | POLICY-03, ADMIN-05; approved accepted self-grant risk. | Query/model payloads cannot override authority; viewer/editor/token/stale-reauth denial; explicit owner self-grant audited/revisioned; no declassification. | Reviewed C-05 endpoint/SDK/UI contracts; no implicit owner read bypass. |

**Deployment gate:** ship policy infrastructure only with restricted-user
access disabled. Complete the bounded feasibility proof before extensive
policy-management UI; do not create a circular prerequisite by requiring the
production resolver for the prototype. Original DATA item dependencies still
apply to production implementation.

### Phase 6 — Direct data surfaces

**Backlog coverage:** DATA-02, DATA-03.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| READ-01 — Authorization-plan contract | Validated internal API/executor plans bound to principal, credential/action, workspace, dataset/version, policy revision, and effective-access fingerprint. | Completed DATA-01: POLICY-03/04; reviewed feasibility and internal executor trust contract. | Client-supplied plan rejection, cross-workspace/subject substitution, missing/stale plans, schema/attribute changes, and revocation races. | Define plan freshness, trusted transport, and revision-check boundaries; no client or AI override. |
| READ-02 — Mandatory executor inputs | Production authorized row/column materialization before untrusted SQL; no accessible raw staging or alternate file/catalog path. | READ-01, POLICY-02 evidence. DATA-02 is parent coverage, not a completion prerequisite. | CTEs/joins/aliases/aggregates, SELECT *, denied-column predicates, catalog discovery, external access, and exact outputs under resource limits. | Measured workload/performance results and executor review; post-query filtering or views over accessible raw tables are insufficient. |
| READ-03 — Query, preview, and history | Shared enforcement for read-only SQL, current/pending/historical previews, versions, and user filters. | READ-02; RBAC-06 token restrictions as required by DATA-03. | Exact rows/columns across browser/token credentials; current policy on old schemas; absent predicate columns deny; optional filters never broaden access. | Dataset/version ownership and historical metadata contracts; retain workspace/resource permissions in addition to policy. |
| READ-04 — Export and metadata | Authorized CSV/Parquet generation and metadata/profile/sample/schema/statistics/count handling; remove raw-file shortcuts for restricted callers. | READ-02/03, ASYNC-03. DATA-03 is parent coverage, not a completion prerequisite. | Exact export contents and errors, no raw snapshot download, schema/count/sample leakage, stream revocation and cleanup. | Export capacity and metadata semantics approved/measured; unsupported paths deny explicitly. |

**Deployment gate:** keep restricted users disabled until Phases 7–8 pass.
Route every enabled direct surface through the common policy layer; a secure
SQL endpoint does not compensate for an unfiltered export or metadata route.

### Phase 7 — Derived data, AI, and writes

**Backlog coverage:** DATA-04, DATA-05, DATA-06.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| SCOPE-01 — Provenance and lineage | Stable authorization attributes/provenance through pipelines, derived datasets, global materialization, and output classification. | READ-03/04; approved DATA-00 lineage and parent-bounded sharing. | Renaming/materialization never broadens access; unclassified outputs deny/recompute; service authority is not reader authority. | C-06 provenance; broader shared aggregates/declassification deferred; no scope inferred from new IDs. |
| SCOPE-02 — Ontology and dashboards | Policy-aware records, relationships, graph/traversal, dashboards and reader-specific metrics/aggregates. | SCOPE-01. DATA-04 is parent coverage, not a completion prerequisite. | Direct IDs, both endpoints, records/counts/properties/search, reader aggregates and dashboard opening. | Reader recomputation; lineage uncertainty denies; no broader shared aggregates. |
| SCOPE-03 — AI and voice context | Authorized schema/samples/retrieval, tool queries/results/errors, transcripts, and generated-action boundaries for local/hosted models. | SCOPE-02, ASYNC-02/03. DATA-05 is parent coverage shared with SCOPE-04. | Narrow/wide readers, conversation sharing, tool intent changes, voice references, model errors, and no authority gained from AI output. | Source/context provenance and transcript retention/retrieval contracts; local inference is not an authorization exemption. |
| SCOPE-04 — Caches and persisted work | Effective-access cache identities, artifact classification, and current reauthorization of saved answers, files, asynchronous outputs, and downloads. | SCOPE-02; RBAC-07; coordinate AI artifacts with SCOPE-03. | Broader-user cache never serves narrower readers; policy/attribute/membership/credential changes invalidate delivery; races/streams meet revocation bound. | Partitioning alone is insufficient; define artifact ownership/sharing and stale-result reject/recompute behavior. |
| SCOPE-05 — Restricted-write denial | Central intent-based denial for restricted-subject ingestion/record/relationship/bulk/generated writes; preserve safe read-only analysis/artifact behavior. | SCOPE-02 and approved read-only scope. DATA-06 is parent coverage. | Direct/generated/retried/resumed/mixed paths deny before business/file/job/external write effects; role alone cannot bypass; local/unrestricted regressions. | Fine-grained write enablement is deferred for separate approval, not claimed complete; C-06 intent contract required. |

**Deployment gate:** restricted-data launch remains disabled. Complete DATA-05
across both AI and persisted/asynchronous surfaces, not just model prompts;
deny any unprotected derived or write surface explicitly.

### Phase 8 — Restricted-data release

**Backlog coverage:** DATA-07.

| Slice | Deliverable | Prerequisites | Focused verification | Unresolved design/release gate |
| --- | --- | --- | --- | --- |
| RELEASE-01 — Coverage reconciliation | Reconcile every enabled route, data surface, job/callback, generic resource, stream, and persisted artifact against the coverage contract. | DATA-03 through DATA-06 implemented; current route/artifact inventory; RBAC-08/RBAC-09. | No alternate path or unclassified output remains; unsupported features deny explicitly; new route detection works. | Inventory approval and complete traceability from surface to enforcement/test. |
| RELEASE-02 — End-to-end isolation | Same-role disjoint/overlapping-grant scenarios across direct/derived data, sharing, AI, exports, history, writes, and revocation. | RELEASE-01 inventory; Phase 6/7 enforcement and approved expected policy outcomes. | Assert exact row/column shapes and artifacts, not just HTTP status/UI hiding; test credentials, policy races, schema changes, and streams. | All enabled surfaces must pass; no restricted-user onboarding on partial evidence. |
| RELEASE-03 — Operational evidence | Migration/restore rehearsals, outage/revocation/resource-limit tests, and measured performance against declared workload/environment/budgets. | Phase 6/7 integration; approved numeric budgets; RELEASE-01 surface scope. | Cross-replica latency and cancellation, audit/policy/store failures, historical data, caches, spills/timeouts, capacity and backup consistency. | Unknown workload/budgets remain blockers; no unmeasured production guarantees or unsafe rollback that drops protections. |
| RELEASE-04 — Reviewed enablement | Security review, user/API/operations docs, supported configurations, controlled rollout, monitoring, disable/rollback procedures, and DATA-07 release sign-off. | RELEASE-01 through RELEASE-03; workspace-RBAC and cloud gates where applicable. DATA-07 is parent acceptance delivered here. | Required project/browser checks, reviewed findings addressed, operator drill, protected-mode feature disabling, and reproducible release evidence. | Explicit approval before restricted access; cloud MFA/security sign-off remains independent of data-isolation completion. |

**Deployment gate:** enable restricted users only for validated configurations
and surfaces. Disabling a feature is a valid containment action; disabling
authorization or silently serving unrestricted results is not.

## Dependency order

For slice completion versus contract/parent-acceptance distinctions, use the
[acyclic completion graph](./rbac-phases/IMPLEMENTATION-READINESS.md#completion-dependency-graph).
A parent ID in a slice's scope is not a requirement to finish the parent
before its own child. Contract co-design may overlap; prerequisites for feature
coding and enablement are not waived.

- RBAC-00 gates RBAC-01 and RBAC-02; both are prerequisites for RBAC-03.
- RBAC-03 precedes RBAC-04, RBAC-07, and RBAC-08A.
- RBAC-05 depends on RBAC-02, RBAC-03, RBAC-04, and RBAC-08A.
- RBAC-06 depends on RBAC-03, RBAC-04, and RBAC-08A.
- RBAC-08 depends on RBAC-08A and completes lifecycle audit coverage after
  RBAC-05 and RBAC-06.
- RBAC-09 is the release gate after RBAC-02 through RBAC-08 are complete.

RBAC-04 depends on the explicit compatibility decision in RBAC-00 even though
it can be developed in parallel with portions of RBAC-03. Do not activate a
production migration before authentication, permission enforcement, backup,
and rollback behavior have all been validated.

Data-isolation order (the dependencies on RBAC items above remain mandatory):

```text
DATA-00 -> DATA-01 -> DATA-02 -> DATA-03 -> DATA-04
                                            |-> DATA-05
                                            |-> DATA-06
DATA-03 through DATA-06 + RBAC-08 + RBAC-09 -> DATA-07
```

## Verification strategy

### Automated API and unit tests

- Use a table-driven matrix of role × permission and token grant × permission.
- Assert authorization before business side effects: no job, business-state
  audit mutation, file write, or provider/source update is created on denial.
  A safe denied-attempt security audit event is permitted and tested
  separately; it must not imply that the operation succeeded.
- Cover malformed/unknown roles and incomplete membership records.
- Cover workspace isolation for reads, writes, token use, and background jobs.
- Test role change and removal against existing browser sessions and tokens.
- Test last-owner, invitation replay/expiry/identity binding, and ownership
  transfer invariants.
- For jobs, test permission revocation before dequeue, during execution before
  commit, and after an atomic commit.
- Use same-role users with different data grants, including absent, empty,
  null-valued, overlapping, and revoked attribute assignments.
- Exercise joins, CTEs, aliases, aggregates, hidden-column predicates, direct
  raw-relation references, and optional filters that try to broaden access.
- Verify exact rows and output columns for previews and both export formats;
  include historical versions and schema changes.
- Cover profiles, samples, ontology traversals, derived assets, metrics, AI
  context, saved results, caches, and service-generated artifacts.
- Assert restricted write-intent denial for direct/generated/ingestion/
  relationship/bulk/resumed paths before effects. Old/new-row write enablement
  requires a separately approved future release.
- Test policy revision races, attribute changes, cache invalidation, and the
  approved in-flight revocation guarantee.

### Browser tests

- Verify members see only actions their roles permit.
- Verify direct API requests remain denied when UI controls are hidden.
- Test invitation creation/acceptance, role changes, removal, and ownership
  transfer with confirmation and error states.
- Test account activation, login/logout, session expiry, password reset, and
  email verification using deterministic accounts and a test mail sink, not
  real email delivery.
- Verify same-role users see different authorized data, not merely different
  controls. Direct requests and downloads must enforce the same restrictions.

### Existing suite and project checks

Follow the repository checks in [`AGENTS.md`](../AGENTS.md):

```sh
pnpm typecheck
pnpm test
pnpm build
```

Run browser tests when UI or login flows change. Do not run opt-in suites that
write to external databases unless the required fixtures and explicit
authorization are present.

## Non-goals

- User-defined/custom roles or an administrative policy editor.
- Organization-level roles spanning multiple workspaces.
- Row/column authorization in the workspace-RBAC milestone alone; it is a
  separate required data-isolation milestone (DATA-00 through DATA-07).
- Arbitrary policy SQL, automatic inference-proof analytics, and unrestricted
  custom masking expressions in the first data-isolation release.
- Public or internet-facing deployment by implication.
- Implementing a cloud Kubernetes hosting platform as part of the RBAC
  backlog. Cloud hosting is an agreed future direction, with a separate
  deployment/security design and operational release gate.
- A custom cryptographic password-hashing implementation, open
  self-registration, or operating Helix Foundry as an OIDC identity provider.
  Application-managed password accounts are now explicitly in scope; external
  OIDC/SSO integration is deferred.
- Treating UI visibility as authorization.
- Allowing service jobs to inherit broad owner permissions by default.

## Release checklist

- [ ] Product/security decisions in RBAC-00 are approved.
- [ ] Invitation-only password activation, verification/recovery, abuse
      controls, initial-owner bootstrap, and session security pass the
      approved account lifecycle tests.
- [ ] Every API route has an approved policy assignment.
- [ ] Collaborative mode fails closed without authenticated identity.
- [ ] Local-mode compatibility and data migration are tested.
- [ ] Last-owner and invitation invariants are enforced transactionally.
- [ ] Token grants are constrained by current memberships.
- [ ] Background jobs re-check authorization before sensitive side effects.
- [ ] Audit records contain no secrets and have an approved read policy.
- [ ] Audit recording and failure behavior are tested before lifecycle
      mutations are enabled.
- [ ] Measurable revocation, migration, and authorization-overhead targets
      have recorded results.
- [ ] Operators have tested rollout/disable procedures and dependency-failure
      diagnostics.
- [ ] Typecheck, tests, build, and relevant browser tests pass.
- [ ] Security, API, user, and operations documentation is current.

### Additional gates before enabling restricted data access

- [ ] DATA-00 through DATA-07 are complete for all enabled surfaces.
- [ ] Explicit dataset grants and trusted attributes determine row/column scope.
- [ ] Queries cannot access raw inputs or denied columns, even indirectly.
- [ ] Preview, history, exports, metadata, ontology, AI, and derived results
      obey the same effective data policy.
- [ ] Restricted subjects cannot change data through direct/generated/ingestion/
      relationship/bulk/resumed paths; fine-grained write enablement is deferred.
- [ ] Cached/persisted results and streams meet the revocation guarantee.
- [ ] Policy administration, owner access, and service authority are explicit.
- [ ] Unsupported surfaces are denied, not silently unrestricted.
