# Phase 2: Workspace authorization and compatibility migration

## Engineering handoff

- **Status:** planned; migration execution needs separate operational approval.
- **Backlog coverage:** RBAC-03, RBAC-04; ACCESS-01 through ACCESS-05.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md); its approved
  contracts and dependencies remain mandatory.
- **Route contract:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 1](./PHASE-1-AUTHENTICATION.md),
  [Phase 3](./PHASE-3-AUDITED-ADMINISTRATION.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-03 and completed Phase 1 gate feature coding; production cutover is separate.

## Expected outcome

All API routes apply consistent server-side permission, membership, credential,
workspace, and resource checks. Private content remains private. Existing local
data has a rehearsed, explicit collaborative migration preserving IDs and
encrypted credentials without silently granting ownership. Deployable policy
code is not permission to enable collaborative users.

## Entry criteria and unresolved gates

- RBAC-03 requires approved RBAC-01 mappings and RBAC-02 identity/session
  contracts. RBAC-04 additionally requires RBAC-00 and RBAC-03.
- Review persistence/revision/invalidation and token grant-set contracts.
- Descendants inherit a parent visibility ceiling and are not independently
  shareable. C-03 must specify the artifact graph/provenance checks; quarantine/
  operator-recovery procedures still require separate review.
- Approve migration collision handling, cross-store coordination, maintenance
  budget, interruption recovery, and backup/restore validation.
- Platform mutation plumbing must remain disabled until Phase 3 durable audit
  and lifecycle integration; this avoids a circular audit prerequisite.
- MFA and reviewed cloud trust boundary remain independent launch blockers.
- C-03 must integrate platform-admin global disablement and cross-workspace
  active-owner/admin invariants; workspace owners remove membership only.

## Mandatory authorization contract

Effective operation permission is current workspace role intersected with
credential grants, plus workspace/resource/identity checks. Retain `viewer`,
`editor`, `owner`; replace ordinal comparisons with named permissions, not
custom roles or a new general-purpose policy engine.

- Viewers read/preview/export/run read-only analysis; editors additionally
  prepare definitions, ingest/manage data, write records, run pipelines, and
  manage saved analyses. Only owners publish active definitions.
- Owner-only administration includes source/AI credentials, privacy/schedules,
  members/invitations/tokens, ownership transfer, workspace deletion, and
  access-control audit reads. Exact route mappings come from the inventory.
- Membership/invitation, source/AI credential, and token administration need
  authorized browser sessions; tokens cannot perform fresh-reauth actions.
- Unknown roles, unverifiable state, deleting workspaces, stale/revoked
  credentials, and cross-workspace references deny before business effects.
- Missing/invalid collaborative identity returns 401; authorization denial
  returns 403; preserve scoped 404 behavior where needed to hide existence.
- UI controls mirror policy but never substitute for direct API enforcement.

### Private content and platform authority

Chats, runs, and saved results default creator-private. Sharing is explicit,
workspace-wide, read-only, current-member-only; no public links, selected-member
audiences, or cross-workspace sharing. Creator alone controls sharing/deletion,
subject to operation permissions. Shared readers cannot edit, resume, cancel,
reshare, or delete. Owners/admins have no implicit private-content access.

Unsharing blocks subsequent reads and terminates ongoing delivery within
5 seconds. Creator removal/disablement quarantines private and shared content;
no automatic transfer, unquarantine, or resharing on return. Apply identical
checks to dedicated/generic routes, feeds, search, caches, descendants, files,
and live sessions. Sharing never declassifies source data.
Children cannot be more visible than their parent or independently shared.
Saved output lacking provable current reader access must deny or be recomputed.
Broader aggregate sharing/declassification is deferred; recompute per reader.

Only platform admins create cloud workspaces, with atomic assignment of an
explicit verified active initial owner. Creating admin gets no automatic
membership. Platform grants/revokes require a browser, fresh reauthentication,
durable audit, and transactional last-active-admin protection. Cloud docs,
OpenAPI, plugin assets, HEAD, redirects, and caches are admin-only; minimal
health and login/static-shell exceptions must be explicit.

Global account disable requires a current platform-admin browser session and
password plus TOTP reauthentication within 5 minutes, durable audit, and
commit-time authority checks. Reject disablement leaving any active workspace
without an active owner or eliminating the last active platform admin; transfer
ownership first. No self-service account deletion/emergency override.
Phase 2 provides guards/contracts; Phase 3 enables the audited route integration.

In an isolation-enabled workspace all human accounts/user tokens are restricted,
including owners with broad explicit grants. Policy/role changes cannot grant
business-data write exemptions. Phase 5-7 implement these later data controls;
Phase 2 must not bake an owner/unrestricted bypass into shared helpers.

## Implementation work packages

### ACCESS-01: Authorization core

- **Depends on:** RBAC-00/01 approvals and RBAC-02 principal/session contracts.
- **Deliver:** typed permissions, role presets, credential ceilings, platform
  authority, and shared workspace/resource authorization helpers.
- **Verify:** positive/negative role x permission x credential matrix, disabled
  accounts, malformed state, deleting workspaces, and dependency outage.
- **Gate:** reviewed persistence/invalidation and token grants; platform
  authority cannot imply workspace membership/data access.
  The slice-completion graph requires AUTH-08; contract co-design is not
  permission to implement against unfinished authentication.

### ACCESS-02: Route enforcement and registration guard

- **Depends on:** ACCESS-01 and approved route mappings.
- **Deliver:** migrate all route modules, conditional intents, generic resources,
  browser-only administration, and registration coverage.
- **Verify:** each current/new method/path has a policy; generated HEAD inherits
  GET; OPTIONS/static/docs exceptions are explicit. Denials enqueue no jobs,
  write no files/business state, and use no external credentials.
- **Gate:** ACCESS-03/04 resource checks must be integrated before enablement;
  unclassified routes stay disabled. The inventory's 83 routes are a historical
  baseline, not a hard-coded permanent count.

### ACCESS-03: Private-content enforcement

- **Depends on:** ACCESS-01 and approved sharing/resource contracts.
- **Deliver:** creator identity, read-only sharing, creator-only mutation,
  unsharing revocation, and departure quarantine across all retrieval paths.
- **Verify:** direct IDs/list/search/generic routes and persisted/live outputs;
  no owner/admin bypass; shared-reader mutation denied; 5-second revocation.
- **Gate:** C-03 descendant/provenance schema and separately reviewed recovery;
  no implied transfer or independently shared child.

### ACCESS-04: Platform and documentation guards

- **Depends on:** ACCESS-01, RBAC-02 sessions/reauth, approved platform lifecycle.
- **Deliver:** cloud workspace provisioning/initial-owner atomicity, platform
  policy plumbing, last-active-admin protection, docs/schema/asset guards.
- **Verify:** account disablement/owner-assignment races, ordinary owners versus
  admins, stale/revoked admins, token denial, global-disable last-active-owner/
  admin races, generated HEAD and caches.
- **Gate:** mutations disabled until ADMIN-01 and ADMIN-03; MFA/cloud review
  must pass before cloud activation.

### ACCESS-05: Maintenance migration and cutover

- **Depends on:** integrated ACCESS-01 through ACCESS-04 under RBAC-03;
  RBAC-02 and approved migration contract.
- **Deliver:** explicit operator mapping of existing local user ID to a verified
  password account; preserved IDs, memberships, provenance, datasets/versions,
  encrypted credentials/key; versioned idempotent maintenance migration.
- **Verify:** repeat/interruption, ambiguous identity collisions, concurrent
  startup, partial-store updates, referential integrity/decryptability, and
  revoked credentials after restart/replica refresh.
- **Gate:** separately approved cutover, verified backup, exclusive coordination,
  restore rehearsal, and pre-service validation; no automatic email merge.

### Migration invariants

1. Local-only installations are unchanged unless cutover is explicitly chosen.
2. Map identity explicitly; block existing-account-ID collisions until reviewed
   reconciliation exists. Do not rewrite references or grant platform authority.
3. Revoke legacy local sessions/API tokens at cutover; users recreate narrowly
   granted tokens. Later password-reset preservation is a distinct policy.
4. Preserve verified legacy creators. Assign unattributed content only where
   provenance supports the mapped owner; otherwise quarantine all retrieval.
5. No old/new process serves partially migrated collaborative state. Startup
   must stop routine local provisioning from reasserting downgraded ownership.
6. Validate without printing keys, credentials, or private content.

## Engineering surfaces and handoff artifacts

Start with [identity/access and generic resources](../../apps/api/src/app.ts),
[route modules](../../apps/api/src/routes),
[onboarding publication paths](../../apps/api/src/onboarding.ts),
[hosting callbacks](../../apps/api/src/hosting.ts),
[shared types](../../packages/shared/src/index.ts), and
[web controls](../../apps/web). Publication enforcement must include publish,
rollback, setup confirmation/build, and resume paths, not just one endpoint.

Deliver route-to-policy/test traceability, permission matrix, resource-sharing
state transitions, migration schema/version/coordination design, redacted
rehearsal results, and rollback/operator instructions.

## Verification and definition of done

- [ ] Every registered route and exception is classified and tested.
- [ ] Every role/credential has positive and negative direct-API cases;
      denial precedes business effects. Safe denied-attempt audit is allowed.
- [ ] Resource privacy, generation/scope, audit-read, and sharing checks cannot
      be bypassed through generic resources or linked artifacts.
- [ ] Migration tests cover repeats, interruptions, collisions, and concurrent
      processes; IDs/data/decryptability preserved, legacy credentials denied.
- [ ] Local no-login behavior remains local-only and does not restore removed
      memberships in collaborative mode.
- [ ] Representative backup/restore rehearsal and measured maintenance budget
      are recorded; no secret values appear in reports.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant browser tests pass.

Follow [AGENTS.md](../../AGENTS.md); this document does not approve destructive
operations, actual credential revocation, restore, or service interruption.

## Deployment, disablement, and exclusions

Deploy gated code with collaboration disabled. Do not activate migration before
authentication, full route enforcement, verified backup, and rollback validation.
Phase 3 is required for audited administration; Phase 4 gates collaborative
rollout. Rollback needs separately approved compatible code plus matching
backup/encryption configuration, with post-backup loss/credential-resurrection
risks documented. Never silently restore no-login shared access or promise
in-place schema downgrade.

Excluded: running an actual migration, cloud provisioning, audited lifecycle
enablement, and row/column isolation.
