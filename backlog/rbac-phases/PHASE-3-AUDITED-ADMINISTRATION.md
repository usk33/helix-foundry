# Phase 3: Audited membership and token lifecycle

## Engineering handoff

- **Status:** planned; privileged mutations are not enabled by this document.
- **Backlog coverage:** RBAC-08A, RBAC-05, RBAC-06, RBAC-08;
  ADMIN-01 through ADMIN-05.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Route contract:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 2](./PHASE-2-AUTHORIZATION-MIGRATION.md),
  [Phase 4](./PHASE-4-WORKSPACE-RBAC-PILOT.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-03 and mapped prerequisite completion gate coding, not merely document order.

## Expected outcome

Authorized browser users can administer invitations, membership, ownership,
platform authority, and allowed API-token grants with durable redacted audit
records. Concurrent updates cannot eliminate the last workspace owner or last
active platform admin. Role changes constrain existing credentials immediately
at subsequent authorization checks.

## Entry criteria and unresolved gates

- RBAC-08A requires RBAC-03; establish audit before lifecycle enablement.
- RBAC-05 requires RBAC-02/03/04/08A; RBAC-06 requires RBAC-03/04/08A.
  RBAC-08 completes event coverage after RBAC-05/06 and requires RBAC-03/08A.
- Phase 1 activation/reauthentication and Phase 2 membership/resource contracts
  and migration validation must be integrated.
- Extend Phase 1's durable account-security primitives; do not create a second
  incompatible audit subsystem or a backwards Phase 1 completion dependency.
- Approve durable transaction or equivalent outbox consistency, audit retention/
  export, exact lifecycle endpoints, idempotency, and token grant-set mapping.
- Coordinate disablement/privilege promotion with MFA and last-owner/admin
  invariants. Emergency/lost-email/quarantine recovery is separately reviewed;
  no public override or content-access bypass is approved.
- Token expiry/last-used schema choices need contract review; test expiry for
  supported expiring credentials without inventing a mandatory lifetime.

## Mandatory lifecycle behavior

### Invitations and membership

- Owners use authorized browser sessions to list/manage members and issue/
  revoke invitations. Viewers/editors and API tokens cannot administer them.
- Invitations are 48-hour, digest-stored, single-use, revocable proofs bound
  to the intended verified email. Atomic acceptance consumes proof and creates
  membership; replay, mismatch, expiry, and revoked invitation deny.
- Phase 1 owns new-account activation with independent email verification;
  existing-account acceptance requires authenticated matching verified email.
  Verification alone never grants membership or platform authority.
- Stable user IDs retain memberships across email changes. Old-address
  pending invitations revoke when verified email change commits. Notify the
  user to request a new invite; only an authorized workspace owner reissues
  to the newly verified address. Acceptance/email-change races must not consume
  stale proof; no silent transfer or automatic reissue.
- Protect last-owner invariants for removal, demotion, disablement, and transfer,
  including concurrent operations. Ownership transfer requires fresh
  reauthentication within 5 minutes.
- Removal/disablement quarantines the creator's private/shared content, with
  no automatic transfer or resharing on return. Subsequent reads deny and
  in-flight delivery must stop within 5 seconds.

### Platform authority and API tokens

- Only an existing platform admin grants/revokes platform authority for
  verified active accounts, browser-only with fresh reauthentication and audit.
  Protect the last active admin transactionally, including disablement/deletion.
  Platform authority grants no membership or private-content access.
- Only current platform admins globally disable accounts, through a browser
  with password plus TOTP reauthentication within 5 minutes and durable audit.
  Workspace owners may remove membership but cannot disable accounts globally.
  Reject disablement leaving any active workspace without an active owner or
  eliminating the last active admin; require ownership transfer first.
  Deny all affected sessions/tokens/delegations and quarantine content. No
  self-service deletion/emergency override is approved.
- Only authorized owner browser sessions administer tokens. Store digests;
  raw token appears once at creation. Inventory/revoke use opaque handles,
  never authentication digests or raw secrets.
- Current membership/role intersects explicit token grants on every request.
  Read-only tokens cannot mutate; tokens cannot cross workspaces or administer
  members/invitations, source/AI credentials, or tokens.
- Member downgrade/removal, account disablement, explicit revocation, and
  supported expiry deny. Password reset preserves valid tokens; migration
  revokes legacy tokens. Explain the difference in UI/docs.
- Browser password reset/change and verified email change revoke prior browser
  sessions/delegations but preserve valid API-token-origin jobs under current
  rights. Revoking/expiring the originating API token stops its delegated work.
  Normal browser logout/session expiry does not cancel bounded durable jobs;
  document the explicit cancel-my-jobs control from Phase 4.

### Durable audit

Record actor, credential kind, target workspace/resource/account, operation,
result, and safe correlation identifiers under an approved schema. Do not
record passwords, hashes, cookies, raw tokens, proof links, source credentials,
private content, or sensitive policy values.

Privileged success requires a durably committed audit record; an in-memory
buffer is insufficient. Crash/retry must not create unaudited success or
duplicate effects. Recheck authority before commit. Audit access requires
owner `audit.read`; generic-resource paths cannot bypass it. Bound safe
denied-attempt recording to avoid leaking data or unbounded amplification.

## Implementation work packages

### ADMIN-01: Durable audit foundation

- **Depends on:** completed RBAC-03 (ACCESS-01 through ACCESS-04).
  RBAC-08A is this slice's parent coverage, not a prerequisite completion.
- **Deliver:** schema, persistence/outbox/transaction contract, redaction,
  retention/export, authorized reads, and operator diagnostics; reuse Phase 1
  security-event durability for workspace lifecycle events.
- **Verify:** unavailable audit denies privileged mutation, crash between
  business/audit writes, retry/idempotency, secret exclusion, and read denial.
- **Gate:** approve durable consistency and retention before enabling mutations.

### ADMIN-02: Invitations and membership

- **Depends on:** ADMIN-01, RBAC-02 activation, RBAC-03/04 with migration validation.
- **Deliver:** member listing, invitation issuance/revoke/acceptance integration,
  role change/removal, departure quarantine, and safe confirmation/error flows.
- **Verify:** 48-hour boundaries, replay/races, verified binding, viewer/editor/
  token denial, authority loss, and last-owner safety.
- **Gate:** exact endpoint/transaction contracts; no email-only identity match.

### ADMIN-03: Ownership and platform administration

- **Depends on:** ADMIN-01, ACCESS-04, RBAC-02 verified accounts/reauth;
  ADMIN-02 membership operations for transfer.
- **Deliver:** audited transfer and platform grant/revoke with commit-time
  authority checks, global account disable, and cross-workspace active-owner/
  active-admin invariant protection.
- **Verify:** concurrent demotion/removal/disablement, stale reauthentication,
  audit/commit failure, revoked admin, no implicit data access.
- **Gate:** C-03 atomic global-disable/promotion/MFA and revocation integration;
  operator recovery remains separate from normal administration.

### ADMIN-04: API-token lifecycle

- **Depends on:** ADMIN-01, RBAC-03/04, approved browser-only credential ceiling.
- **Deliver:** grant sets, reviewed `readOnly` mapping, issuance/inventory/revoke,
  current membership intersection, SDK/OpenAPI/Developer-tools updates.
- **Verify:** positive/negative grants, cross-workspace and browser-only denial,
  one-time display, redacted inventory, expiry/revocation/downgrade/removal.
- **Gate:** approve grant/expiry/migration contract; never silently broaden grants.

### ADMIN-05: UI integration and complete audit coverage

- **Depends on:** ADMIN-02 through ADMIN-04 and ACCESS-03 sharing hooks.
- **Deliver:** permission-aware UI, confirmations, safe concurrent-change errors,
  token recovery guidance, and complete RBAC-08 event integration.
- **Verify:** direct API remains authoritative after a page goes stale; cover
  invitation acceptance, member/role/owner changes, token lifecycle, platform
  grants/revokes, sharing/unsharing, and departure quarantine.
- **Gate:** SDK/docs/read-access/redaction complete; hide or disable incomplete
  controls rather than implying success.

## Engineering surfaces and handoff artifacts

Start with [workspace routes/tokens](../../apps/api/src/routes/workspace.ts),
[identity/platform/generic resources](../../apps/api/src/app.ts),
[web app](../../apps/web), [SDK](../../packages/sdk),
[shared contracts](../../packages/shared), and [tests](../../tests).
Reuse the reviewed store/transaction patterns, not process-local locks.

Deliver endpoint/event schemas, role/token grant matrices, transaction/race
design, last-owner/admin state transitions, redaction/retention contract,
browser flows, and an event-to-test coverage list.

## Verification and definition of done

- [ ] Audit infrastructure is proven durable before lifecycle enablement.
- [ ] Every lifecycle mutation has actor/target/result coverage without secrets.
- [ ] Invitation acceptance/role transfer are atomic under concurrent requests.
- [ ] Last-owner and last-active-admin tests include cross-replica disablement,
      removal/demotion, retries, stale authority, and concurrent workspace
      creation/owner assignment. Owner membership alone cannot globally disable.
- [ ] Email-change commit invalidates old-address pending invitations, including
      acceptance races; no automatic reissue or membership identity rewrite.
- [ ] Browser-only controls deny owner API tokens; stale UI cannot bypass API.
- [ ] Existing token authority changes on the next authorization check; Phase 4
      integration proves the 5-second ongoing-work/delivery bound.
- [ ] Privacy/quarantine and token-preservation/cutover distinctions are tested.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser tests pass.

Use isolated stores/mail sinks; no production mail, live token revocation, or
database mutation is authorized. Follow [AGENTS.md](../../AGENTS.md).

## Deployment, disablement, and exclusions

Deploy audit foundation before privileged lifecycle mutations. Features may
deploy disabled to existing local installations; collaborative-user rollout
still waits for Phase 4. Audit/store outages deny mutations with safe operator
diagnostics, never success-shaped fallbacks. Disable affected operations if
invariants fail; do not bypass audit or revive legacy credentials to restore UX.
Preserve state/audit in a compatible rollback; actual restore needs approval.

Excluded: custom roles, selected-user/public sharing, implicit moderation or
content transfer, self-service exceptional recovery, cloud provisioning, and
row/column isolation.
