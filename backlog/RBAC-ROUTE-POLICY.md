# RBAC route-policy inventory

Planning baseline inspected and target mappings approved on 28 October 2026.
This is a migration specification, not shipped enforcement, a completed security review, or deployment
approval. The product decisions and release gates are in
[RBAC-IMPLEMENTATION.md](./RBAC-IMPLEMENTATION.md).

## Readiness-review refinements

The [decision/dependency ledger](./rbac-phases/IMPLEMENTATION-READINESS.md)
records user-approved refinements on 28 October 2026. Exact new endpoints still
need engineering-reviewed schemas/policy entries before coding.

- Privileged MFA is password plus TOTP; password plus one-use recovery code
  revokes sessions and permits only factor re-enrollment until verification.
  Technical protocol is pending, not method selection. No email-only reset.
- Descendants are bounded by parent visibility and not independently shareable.
  Saved outputs require provable current source access or deny/recompute.
  Broader aggregate sharing/declassification is deferred; recompute per reader.
- Initial data policies are per-subject grants/typed predicates, no groups.
  OR row scopes require identical column allowlists per subject/dataset.
  Conflicts reject/deny; no independent row/column union.
- `data_policies.manage` is owner-only, browser-only with reauthentication within
  5 minutes, durable audit and revision invalidation. The user accepted explicit
  owner self-grant risk; owners/admins get no implicit data-read bypass.
- Restricted subjects are read-only even when their role permits writes.
  Deny data-changing ingestion/record/relationship/bulk/generated/resumed
  intents before effects. DATA-06 implements denial; full restricted-write
  enablement is deferred. Classify intent, not HTTP method: read-only analysis/
  saved-artifact operations still need reviewed privacy/data-scope controls.
- Phase 1 provides durable account-security audit primitives; Phase 3 extends
  them. Early account mutations cannot depend on a future Phase 3 foundation.
- All humans/user tokens in an isolation-enabled workspace are restricted;
  owner/full-read grants do not permit business-data writes. No per-user
  unrestricted-writer exemption or client/role/policy-update escape.
- Durable manual jobs use bounded one-job delegation and may survive normal
  browser logout/expiry. End that session's delivery; retrieve only using a
  current caller credential/data scope. A delegation never authenticates an
  API request, another job or a live-browser callback.
- Password reset/change and verified-email change revoke prior browser sessions
  and browser-origin delegations. Valid API-token-origin jobs survive subject
  to current rights and originating token expiry/revocation. Cancellation/
  delegation expiry/disablement/rights loss still meets the 5-second bound.
- Global account disable is platform-admin browser-only, fresh password plus
  TOTP, durably audited, and cannot remove the last active admin or leave an
  active workspace without an active owner. Workspace owners remove membership
  only; transfer ownership first. Exact new endpoint contracts remain pending.
- Email-change commit revokes old-address pending invitations and fences racing
  acceptance. Only an authorized owner explicitly reissues to the verified
  new email; no automatic transfer/reissue or stable-ID membership rewrite.

Use the [lifecycle matrix](./rbac-phases/IMPLEMENTATION-READINESS.md#lifecycle-acceptance-matrix)
for execution-versus-delivery tests. Add policies for new account-disable/
cancel-my-jobs endpoints before registration; do not present them as existing
routes or silently broaden the historical 83-route baseline.

## Conventions and coverage

- `W` means `/api/v1/workspaces/:w`. Every table entry is one registered
  method/path pattern, not one instance of a resource or dynamic parameter.
- Current `V`, `E`, and `O` mean minimum viewer, editor, and owner respectively.
  `access(req)` defaults to `V`; `user(req)` resolves identity only. Missing
  Authorization currently provisions the local owner, not a cloud session.
- Every target workspace permission also requires current membership, a
  non-deleting workspace, credential/workspace matching, credential-grant
  intersection, and validated roles. Resource kind, workspace scope,
  generation, sharing, and data policies remain additional checks.
- Target mappings have product approval; implementation and testing are pending.
  `workspace.read` is V/E/O; editing permissions are E/O; publication and
  administration are O. Browser-only and reauthentication requirements
  narrow permissions further. Data isolation remains gated separately.
- Sensitive membership/invitation, source/AI credential, and token
  administration require authorized browser sessions even when a token's
  creating user is an owner. Reauthentication-required actions deny API tokens.
- Chats, runs, and saved results default to creator-private; workspace sharing
  is explicit and never widens the reader's data policy. Neither workspace
  owners nor platform administrators implicitly read private content.
- Sharing is workspace-wide and read-only; creator alone controls sharing
  and deletion subject to operation permissions. Readers cannot edit, resume,
  cancel, or reshare. Creator removal/disablement quarantines private and
  shared content; unsharing/departure revokes ongoing delivery within 5 seconds.
- Future hosting targets an internet-reachable HTTPS application with
  invitation-only accounts and private internal services. This inventory does
  not approve exposing the current installation or replace cloud security review.
- Inspected sources register **83 `/api/v1` method/path patterns**: core 5,
  workspace 20, data 16, pipelines 2, ontology 9, analyst/live 14, onboarding 11,
  and hosting 6. The onboarding registration loop expands to both
  `recommendations` and `build`. The `imports/:id/:action` pattern remains one
  route, with only `retry` and `cancel` accepted.
- Fastify-generated HEAD routes must inherit GET policy; framework OPTIONS,
  documentation assets, and static UI routes require explicit exceptions in
  the eventual registration test. They are not additional hand-written API
  patterns in this count.

## Core identity, workspaces, and generic resource reads

Source: [app.ts](../apps/api/src/app.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me` | `user(req)` | Authenticated self | Return only this user's profile and accessible workspaces; respect token workspace ceiling. No local provisioning in collaborative mode. |
| POST | `/api/v1/workspaces` | `user(req)` + session only | Authenticated browser + platform-admin authority in cloud mode | Assign a verified active initial owner atomically with creation; admin gets no automatic membership. Workspace ownership does not grant platform authority. Admin provisioning, quotas, and local-mode compatibility still need implementation design. |
| DELETE | `W` | O + session only | `workspace.delete` + browser + fresh reauthentication | Preserve deletion state and cleanup invariants. Review the current installation-wide last-workspace rule for multiple users; never substitute a global count for owner/membership checks. |
| GET | `W/resources/:kind` | V + public-kind allowlist | Kind-aware `workspace.read` / `data.read` / `audit.read` | Current readable kinds include run/job/audit; apply their ownership/audit policies here too. Preserve generation filtering, scrubbing, and authorized counts. |
| GET | `W/resources/:kind/:id` | V + kind/scope + generation | Kind-aware `workspace.read` / `data.read` / `audit.read` | Same policy as list and dedicated endpoints; generic IDs must not bypass thread/run, historical-data, or audit restrictions. |

## Workspace, provider, publication, and token administration

Source: [workspace.ts](../apps/api/src/routes/workspace.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `W/home/metrics` | V | `workspace.read` + `data.read` | Reader-authorized metrics when data isolation is enabled. |
| POST | `W/home/metrics/regenerate` | E | `definitions.edit` | Persists shared metric definitions; preserve actor and reauthorize AI/job effects. |
| GET | `W/home` | V | `workspace.read` + `data.read` | Shared summaries and metrics require reader policy. |
| GET | `W/overview` | V | `workspace.read` + `data.read` | Counts, samples, and aggregate summaries are data surfaces. |
| GET | `W/provider` | V | `workspace.read` | Sanitized status/settings only; never return API keys. |
| PUT | `W/provider` | O | `provider.manage` | Credential updates and outbound provider tests; safe audit record. |
| POST | `W/provider/pull` | O | `provider.manage` | Long NDJSON stream and outbound model download; enforce approved in-flight revocation behavior. |
| GET | `W/activity` | V | `workspace.read` + event-specific visibility | Do not expose owner-only access-control audit events via the general feed. |
| GET | `W/events` | V, repeated about every 2 seconds | `workspace.read` + per-item visibility | SSE must reauthorize session, token, membership, and item visibility throughout delivery. |
| GET | `W/proposals/:id/comparison` | V | `workspace.read` + `data.read` | Scope, proposal validity, input versions, and authorized comparison values. |
| PUT | `W/proposals/:id` | E | `definitions.edit` | Proposal scope/kind and validation. |
| POST | `W/proposals/:id/validate` | E | `definitions.edit` | Validation may read datasets; apply data policy as well. |
| POST | `W/proposals/:id/publish` | E | `definitions.publish` (O) | Intentional E-to-O change; reauthorize at publication commit. |
| POST | `W/proposals/:id/reject` | E | `definitions.edit` | Preserve non-published/status checks. |
| POST | `W/rollback` | E | `definitions.publish` (O) | Republishes definitions, not merely a draft edit; revalidate inputs and audit. |
| GET | `W/tokens` | O | `tokens.manage` | Opaque handles only; current GET can backfill public IDs. Prefer explicit migration for that write. |
| POST | `W/tokens` | O | `tokens.manage` | Record creating user/workspace/grant; digest-only storage and one-time raw display. Browser-only administration is required. |
| DELETE | `W/tokens/:id` | O | `tokens.manage` | Validate workspace for legacy digest IDs and public handles; audit without secret material. |
| GET | `W/definitions/export` | V | `workspace.read` | Definition export is not raw data export; review embedded SQL/schema metadata under DATA coverage. |
| POST | `W/definitions/import` | E | `definitions.edit` | Creates validated proposals only; import must not publish implicitly. |

## Data, sources, queries, and findings

Source: [data.ts](../apps/api/src/routes/data.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| POST | `W/demo` | E | `data.ingest` | Sample-data writes and optional setup advancement; no implicit publication authority. |
| POST | `W/ingest` | E | `data.ingest` | Optional existing dataset must belong to workspace; restricted writes additionally need DATA-06. |
| POST | `W/upload` | E | `data.ingest` | Authorize before file creation; limits, cleanup, and ingestion policy. |
| POST | `W/datasets/:id/preview` | V | `data.read` | Exact authorized rows/columns; dataset/version validity. |
| POST | `W/datasets/:id/versions/:version/preview` | V | `data.read` | Historical version must belong to dataset/workspace and use current policy. |
| PUT | `W/datasets/:id/privacy` | O | `privacy.manage` | Hosted-AI sensitivity flags are not data-access grants. |
| PATCH | `W/datasets/:id` | E | `data.manage` | Description-only update; does not imply row writes or policy administration. |
| POST | `W/datasets/:id/accept-version` | E | `data.manage` | Changes active dataset version; validate dataset/version linkage and current policy. |
| GET | `W/datasets/:id/export` | V | `data.export` | CSV is queried, Parquet currently streams raw snapshot; replace/deny raw shortcut for restricted users and reauthorize delivery. |
| POST | `W/sources` | O | `source.manage` + `source.credentials.manage` | Scope hosted-account references; test/discover connection and seal credentials. |
| PUT | `W/sources/:id/schedule` | O | `source.manage` | Changes related connection schedules; explicit service authority for later scheduled work. |
| POST | `W/sources/test` | O | `source.credentials.manage` | Outbound connection test; enforce credential scope and approved network controls. |
| POST | `W/sources/:id/sync` | E | `source.sync` | May reuse/promote an existing job; persist actor/intent and distinguish manual from service authority. |
| POST | `W/query` | V | `data.query` | Authorize all inputs before executing read-only SQL; preserve executor restrictions. |
| POST | `W/queries` | E | `analysis.manage` + `data.query` | Executes SQL then persists a query definition; default-private saved results require explicit sharing and current data policy. |
| POST | `W/findings/:id/dismiss` | E | `data.manage` | Finding kind/workspace and safe state transition. |

## Pipelines

Source: [pipelines.ts](../apps/api/src/routes/pipelines.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| POST | `W/pipelines/draft` | E | `definitions.edit` | Compile/validate nodes, save proposal; no publication grant. |
| POST | `W/pipelines/:id/run` | E | `pipelines.run` | Kind/scope/generation, dataset inputs, actor-bound execution, and output lineage; reauthorize job side effects. |

## Ontology, records, graph, and actions

Source: [ontology.ts](../apps/api/src/routes/ontology.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `W/ontology/relationships` | V | `workspace.read` | Policy-aware definition metadata when restrictions apply. |
| POST | `W/ontology/relationships/preview` | E | `definitions.edit` + `data.read` | Preview only; endpoint IDs, attributes, and counts need policy. |
| GET | `W/records/:logicalId` | V | `data.read` | Active generation, effective overlay, related records, and safe record-history visibility. |
| GET | `W/objects/:id/neighbors` | V | `data.read` | Both endpoints and returned IDs must be authorized. |
| GET | `W/graph` | V | `data.read` | Traversals, focus, edges, counts, and truncation metadata. |
| POST | `W/actions/change/preview` | E | `records.write` + `data.read` | Validate permitted fields and endpoints; preview does not grant execution. |
| POST | `W/actions/change/execute` | E | `records.write` | Restricted data-changing intents deny before effects; preserve preview hash/generation/idempotency and intended unrestricted checks. Fine-grained restricted writes deferred. |
| POST | `W/actions/preview` | E | `records.write` + `data.read` | Validate editable non-key properties, current object, and overlays. |
| POST | `W/actions/execute` | E | `records.write` | Restricted data-changing intents, including revert, deny before effects; retain intended unrestricted revision/idempotency safeguards. |

## Analyst, threads, and live sessions

Source: [analyst.ts](../apps/api/src/routes/analyst.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `W/threads` | V | `workspace.read` + approved thread visibility | Currently lists workspace chats; target lists only creator-owned or explicitly shared chats. No implicit owner/admin access. |
| GET | `W/threads/:threadId` | V | `workspace.read` + approved thread visibility | Apply same rule to nested runs and generic resource endpoints. |
| GET | `W/threads/:threadId/followups` | V | `workspace.read` + approved thread visibility + `data.read` | Current generation and source-input visibility. |
| DELETE | `W/threads/:threadId` | E | `analysis.manage` + approved thread ownership | Reject active runs; creator rights do not imply moderation of another person's thread. |
| POST | `W/assistant/runs` | E for build, V otherwise | `assistant.build` or `assistant.answer` | Validate parent/context ownership; resolved intent must not broaden rights. Publication separately requires `definitions.publish`. |
| POST | `W/assistant/runs/:id/cancel` | V + owner-of-answer or writable E/O | Matching assistant permission + ownership/moderation rule | Current V/read-only token may cancel own non-build; proposed admin moderation must be explicit, not ordinal-role logic. |
| POST | `W/assistant/runs/:id/resume` | V + owner-of-answer or writable E/O | Matching assistant permission; add `definitions.publish` for publishing tasks | Retry may resume an onboarding build and replace actor authority; check task/intent and actor at enqueue and commit. |
| POST | `W/assistant/runs/:id/save-analysis` | E | `definitions.edit` + approved run visibility | Reads stored answer and creates a dashboard proposal; reauthorize original inputs. |
| GET | `W/live` | V | `assistant.answer` | Sanitized availability only. |
| POST | `W/live/sessions` | V | `assistant.answer` | Bind to user/workspace/session credential; validate chat ownership. Build delegation needs separate authority. |
| GET | `W/live/sessions/:sessionId` | V + bridge user/scope binding | `assistant.answer` + session ownership | Current membership/credential plus live-session owner. |
| POST | `W/live/sessions/:sessionId/delegations/:delegationId` | V + bridge user/scope binding | `assistant.answer`; additional permission for delegated intent | A claimed delegation is not a new authorization grant. |
| POST | `W/live/sessions/:sessionId/context` | V + bridge user/scope binding | `assistant.answer` + `data.read` + session ownership | Reauthorize referenced context, not only session ID. |
| DELETE | `W/live/sessions/:sessionId` | V + bridge user/scope binding | `assistant.answer` + session ownership | Terminate only owned session; revoke/close on account/session/access loss. |

## Onboarding

Source: [onboarding.ts](../apps/api/src/onboarding.ts).

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `W/onboarding` | V | `workspace.read` + per-resource visibility | Setup state includes jobs, runs, suggestions, and data metadata. |
| PATCH | `W/onboarding` | E | `definitions.edit` | Selected IDs in workspace; field-specific checks if schema gains privileged settings. |
| POST | `W/onboarding/provider` | O | `provider.manage` | Actor-bound preparation job; recheck before saving credentials/provider state. |
| POST | `W/onboarding/sources` | O | `source.manage` + `source.credentials.manage` + `data.ingest` | Source creation/import jobs, idempotency, credential handling. |
| PUT | `W/onboarding/sources/:id` | O | `source.manage` + `source.credentials.manage` | Credential/source edit; scope and kind checks. |
| POST | `W/onboarding/uploads` | E | `data.ingest` | Authorize before file writes; actor-bound upload job. |
| POST | `W/onboarding/imports/:id/:action` | E, O for provider job | `data.ingest` for upload, `source.sync` for sync, `provider.manage` for provider preparation | Only retry/cancel and supported job kinds; preserve selected-provider check and reauthorize execution. |
| POST | `W/onboarding/recommendations` | E | `assistant.build` | Recommendation preparation, not publication; source context needs data policy. |
| POST | `W/onboarding/build` | E | `assistant.build` + `definitions.publish` (O) | Setup build can publish; either require owner now or redesign as editor draft plus owner approval. Target here uses owner. |
| POST | `W/onboarding/ontology` | E | `definitions.edit` | Suggestion generation; apply data/AI policy and preserve input signature. |
| POST | `W/onboarding/ontology/confirm` | E | `definitions.publish` (O) | Confirmation starts publishing build; validate suggestion hash/input signature and actor again at commit. |

## Hosted-source connections (not application login)

Source: [hosting.ts](../apps/api/src/hosting.ts). These OAuth callbacks connect
data providers; choosing application passwords does not remove these routes.

| Method | Path | Current check | Target permission or decision | Resource/credential checks and migration notes |
| --- | --- | --- | --- | --- |
| GET | `W/hosting` | V | `workspace.read` | Sanitized provider/account labels only; clarify visibility of account names if sensitive. |
| POST | `W/hosting/:provider/authorize` | O + session only | `source.credentials.manage` + browser | Bind expiring single-use flow to provider, workspace, user, session, and browser cookie. |
| GET | `W/hosting/:provider/callback` | Flow state/cookie + stored session + owner membership | Flow-bound exception + current `source.credentials.manage` | Not public authorization bypass: verify state, session expiry/revocation, workspace deletion, actor/grant, and reauthorize credential persistence after exchange. |
| POST | `W/hosting/:provider/options` | O | `source.credentials.manage` | Workspace/provider/account binding; remote discovery may refresh credentials. |
| POST | `W/hosting/:provider/token` | O | `source.credentials.manage` | Stores provider credentials, not an app session; safe audit and secret redaction. |
| POST | `W/hosting/:provider/connect` | O | `source.manage` + `source.credentials.manage` | Resolve account scope; connection discovery and writes remain owner-authorized. |

## Explicit non-workspace and framework exceptions

| Surface | Current behavior | Target decision |
| --- | --- | --- |
| `GET /api/health` | No identity check; basic service response | Minimal public health response. Do not expose credentials or detailed dependency configuration. |
| `GET /api/openapi.json`, `/api/docs` and plugin assets | No identity check | Cloud access requires authenticated platform-admin authority, including schema URLs, assets, and generated HEAD; preserve intended local-only behavior separately. |
| Static web assets and SPA fallback | Registered when web build exists; unknown `/api/` paths return 404 | Public login/UI shell is not authenticated data access. Preserve API 404, no fallback success for unknown API routes. |
| Generated HEAD/OPTIONS | Framework behavior, not separate source handlers | HEAD inherits GET; OPTIONS only approved CORS/preflight behavior, never a data/mutation exception. |

## Approved decisions and migration deltas

1. Owner-only publication affects publish, rollback, onboarding build,
   ontology confirmation, and retry/resume paths. Carry the same requirement
   into publication workers, including editor-created drafts later approved
   by an owner. Automatic intent resolution must not elevate editors.
2. Approved additions to the permission catalog:
   `data.manage` (dataset metadata/version decisions and finding dismissal),
   `records.write` (record/relationship actions), `pipelines.run`, and
   `analysis.manage` (saved queries and chat deletion). Approved grants are
   E/O, not V. These distinguish data writes and execution from definition
   editing; they do not add custom roles.
3. Chats, runs, and saved results are private to the creator by default,
   with explicit workspace sharing and no implicit owner/platform-admin
   access. Moderation is not granted by ownership. Existing chats lack a complete collaboration sharing
   model. Retain verified legacy creator ownership; attribute local content to
   the mapped local owner only where provenance establishes ownership.
   Otherwise quarantine it from collaborators until an explicitly authorized,
   audited review; do not invent ownership or share it automatically.
4. Approved `audit.read` and access-control event visibility:
   owner-only access-control audit; sanitized ordinary activity remains
   readable by workspace members. Generic audit resources, record histories,
   Home, activity, and events must not bypass that distinction.
5. Only platform administrators create cloud workspaces; this authority is
   distinct from workspace ownership and confers no implicit data access.
   Creation atomically assigns an explicitly selected verified active initial
   owner; the creating admin receives no automatic membership.
6. Approved credential ceiling: API tokens never manage memberships,
   invitations, credentials, or other tokens, and cannot perform
   reauthentication-required owner actions. Specify the exact allowed grant
   set under RBAC-06. Revoke legacy API tokens at collaborative cutover; this
   does not change the policy preserving tokens after later password resets.
   Read-only tokens may still run
   read-only queries and own answer/cancel flows if explicitly granted;
   HTTP POST alone is not evidence of a write.
7. Workspace-wide read-only sharing is creator-controlled; readers gain no
   modification/run-control rights. Unsharing blocks subsequent reads and
   stops streams within 5 seconds. Creator removal/disablement quarantines
   private and shared content without automatic ownership transfer.
8. Existing platform admins may grant/revoke platform authority for verified
   active accounts via browser-only, recently reauthenticated, audited
   operations. Protect the last active admin transactionally; no implicit
   workspace membership/data access. Cloud documentation is admin-only.

## Remaining design and implementation gates

- Implement the approved 30-minute, operator-issued, single-use
  platform-admin bootstrap with verified email and password setup; reissue
  invalidates earlier links and successful completion closes bootstrap
  atomically. Implement explicit atomic workspace-owner assignment and the
  approved audited browser-only admin lifecycle; define quotas, deletion safeguards, and
  local-mode compatibility.
  Do not equate the local owner with a cloud platform admin.
- Implement approved sharing, unsharing, creator-only controls, departure
  quarantine, and legacy-content migration. Define the parent-bounded descendant graph,
  and separately reviewed operator quarantine/emergency-admin recovery. No
  self-service exceptional recovery, moderation, or content transfer is in the
  first release; no automatic unquarantine/resharing on reactivation or rejoin.
  Shared content must not expose source data
  beyond the reader's current grants.
- Implement admin-only cloud documentation and finalize exact conditional
  permissions where helper/job implementations combine operations.
- Apply approved session targets: 12-hour maximum, 30-minute inactivity,
  5-minute reauthentication freshness, and 5-second ongoing-work revocation.
  Subsequent authorization checks after committed revocation deny immediately.
  Only explicit authenticated user interactions extend last activity; polling,
  SSE, keepalives, and token traffic never extend browser-session idle expiry.
  Define server-side request classification and test across replicas. No
  atomic-commit exception is permitted: block operations that cannot safely
  stop within 5 seconds. Prove commit fencing/cancellation and durable outcome
  consistency; merely sending a cancel request is insufficient.
- Password reset revokes all existing browser sessions and preserves API
  tokens. Explicit revocation, expiry, account disablement, and current grants
  still constrain those tokens; recovery guidance must explain the residual
  stolen-token risk. MFA is required for platform admins and workspace owners
  before cloud launch using TOTP and recovery codes. Method/policy is selected;
  C-02 technical parameters, factor-key lifecycle, replay/skew/abuse controls
  and restricted-recovery enforcement remain open.
- Apply the approved invitation (48-hour), email-verification (30-minute),
  recovery (30-minute), password-policy, and Gmail/configurable-SMTP contract
  in [RBAC-IMPLEMENTATION.md](./RBAC-IMPLEMENTATION.md). These flows need
  endpoint policy entries before implementation; reset/activation links are
  bounded proof-based flows, not general public account-write authority.
- Apply approved account/IP limits and email normalization consistently to
  new account endpoints. Argon2id starts at 64 MiB, 3 iterations, parallelism 1;
  benchmark hashing capacity and bound concurrency before release. Protect
  rate-limit counters across replicas and validate trusted proxy/IP handling
  before using client IP for enforcement.
- Implement the approved explicit local-user mapping, maintenance cutover,
  legacy-token/session revocation, and compatible-code/matching-backup rollback
  contract in [RBAC-IMPLEMENTATION.md](./RBAC-IMPLEMENTATION.md). Test
  quarantine and revoked credentials through dedicated and generic routes;
  no old process or replica may serve partially migrated state.
- Apply the consolidated decision/release-evidence package in
  [RBAC-IMPLEMENTATION.md](./RBAC-IMPLEMENTATION.md): unverifiable identity/
  session/permissions fail closed; privileged mutations require durable audit;
  mail failures leave activation/recovery pending with bounded retry and
  operator diagnostics. Approve workload/environment and numeric budgets
  before benchmarking; measured capacity and cloud sign-off remain outstanding.
- Follow AUTH-01 through AUTH-08 in
  [RBAC-IMPLEMENTATION.md](./RBAC-IMPLEMENTATION.md) for the Phase 1 planning
  breakdown. Exact new endpoint contracts are not yet approved/registered;
  include their policies before implementation. This is not authorization to
  start authentication code or enable collaborative mode.

## Registration and test design

Under RBAC-03, register routes through a typed policy declaration that
distinguishes public, authenticated-self, platform-admin, workspace-permission, and flow-bound
callback policies. Reject missing policy assignments rather than silently
defaulting to viewer. Associate conditional intents/resource kinds with typed
resolvers; document framework exceptions separately.

Add a test using Fastify's route-registration hook before routes are mounted.
Compare normalized method/path registrations with the approved inventory,
expanding onboarding loops and handling generated HEAD explicitly. Assert
that each API route has policy metadata and that every inventory entry is
registered. Detect both an unclassified new route and a stale inventory entry.
This is a proposed test design, not an implemented guard.

Run table-driven positive and negative role/grant tests for each policy, plus
per-route tests proving authorization precedes file writes, enqueue, outbound
credential use, publication, and state updates. Test resource ownership through
dedicated and generic endpoints, and permission changes during streams and
async work. Keep denied-attempt audit events distinct from forbidden business
side effects.

Future password-account, session, membership, invitation, recovery, and
ownership-transfer endpoints are not registered today and are excluded from
the 83-pattern baseline. Their exact contracts and policies must be added to
this inventory as they are designed; they are not implicit public exceptions.
The same requirement applies to new sharing and platform-admin management
endpoints. Their approval does not mean those routes currently exist.

## Background and callback boundaries

- Manual source sync, upload/import, and pipeline jobs need persisted actor,
  credential ceiling, and operation intent; scheduled/CDC jobs need explicit
  service authority instead of inferred owner rights.
- Assistant runs and setup builds need current permissions at execution,
  resolved-intent changes, retry, and publication commit. Provider-preparation
  jobs need `provider.manage` before saving settings.
- SSE, model-download streams, CSV/Parquet streams, and live voice sessions
  need the approved measurable revocation behavior during delivery.
- Hosted-provider callbacks and refreshes need explicit authority at the
  credential write boundary, not just when the flow began.
- Workspace cleanup must follow approved deletion authority and maintain
  recoverable/idempotent progress; data-policy changes must invalidate stale
  result delivery as defined by DATA-00.

## Status

Current source registrations have been inventoried, and target permission
mappings, private-content defaults, browser-only sensitive administration,
and platform-admin-only workspace creation have product approval. Enforcement,
remaining detailed designs, and the registration guard are not implemented.
RBAC-01's runtime/test acceptance and Phase 0's other gates remain open.

The 83-pattern count was re-verified against the API source on 28 October 2026
and still matches: core 5 (excluding the documented `/api/health` and
`/api/openapi.json` exceptions), workspace 20, data 16, pipelines 2, ontology 9,
analyst/live 14, onboarding 11 after the `recommendations`/`build` loop
expansion, and hosting 6. This is a counting check against today's source and
expires as soon as routes change; it is not the automated registration guard,
which RBAC-03 still owns.
