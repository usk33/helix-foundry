# Phase 6: Direct data protection

## Engineering handoff

- **Status:** planning depth; subject to DATA-00 and reviewed executor feasibility.
- **Backlog coverage:** DATA-02, DATA-03; READ-01 through READ-04.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Surface inventory:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 5](./PHASE-5-DATA-POLICY-FOUNDATION.md),
  [Phase 7](./PHASE-7-DERIVED-AI-WRITES.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-05/06 and mapped completed prerequisites gate coding; no executor proof exists.

## Expected outcome

Queries, previews, historical snapshots, CSV/Parquet exports, profiles, samples,
and metadata reveal only currently authorized rows/columns/values. Enforcement
occurs before untrusted SQL and cannot be bypassed through raw snapshots,
alternate relations, or forged plans. Restricted users remain disabled.

## Entry criteria and unresolved contracts

- DATA-02 requires DATA-01; DATA-03 requires DATA-02 and RBAC-06.
- Phase 5 DATA-00 semantics, feasibility evidence, production resolver, trusted
  assignments, and policy revisions must be approved/implemented.
- Use Phase 4 stream cancellation/revocation for downloads; do not implement a
  separate weaker timeout contract.
- Approve internal plan format/trusted transport, freshness/revision boundaries,
  dataset/version binding, historical schema and metadata exposure rules.
- Declare representative snapshots/queries and numeric latency/resource/export
  budgets. Production executor review and measured impact are required.
- No new policy semantics, owner bypass, or default broad grants may be inferred
  while these contracts remain open.
- Use the approved uniform column allowlist per subject/dataset, OR-combined
  row scopes, no groups, and read-only restricted scope. The ledger contains
  concrete exact-output fixtures, not a production enforcement implementation.
  All human accounts/user tokens in an isolation-enabled workspace are
  restricted, irrespective of role or breadth of explicit read grants.

## Mandatory direct-read contract

1. Server-created validated plans bind principal, credential/action, workspace,
   dataset/version, policy revision, and effective-access fingerprint. Clients/
   models cannot submit authority; reject substitution and stale/missing plans.
2. Materialize only authorized rows and columns before untrusted SQL. Remove
   accessible raw staging and alternate file/catalog paths; preserve existing
   executor file/network restrictions and memory/spill/time limits.
3. SQL aliases/CTEs/joins/subqueries/aggregates operate only on authorized input.
   Denied columns cannot be referenced just in filters; output-only masking is
   insufficient. Views over still-accessible raw tables are insufficient.
4. User filters are additional restrictions, not a replacement for policy.
   Current policy applies to current, pending, and historical snapshots.
   Missing predicate columns or unverifiable historical interpretation deny.
5. Metadata is data: schema descriptions, counts, profiles, samples, statistics,
   and errors must not expose denied fields/values under approved semantics.
6. Generate filtered/projected CSV and Parquet; never stream raw snapshots to
   restricted callers. Protect downloads and temporary/output artifact access,
   including current reauthorization and cleanup on cancellation/failure.
7. Browser/token access obeys equivalent data restrictions plus current role/
   credential/resource ceilings. Cross-workspace, disabled/revoked, and unknown
   policy state deny before work.
8. Recheck authority/revisions at sensitive execution/retrieval boundaries.
   Subsequent checks deny after committed revocation; affected ongoing work/
   delivery safely stops within 5 seconds, without an atomic-commit exception.
   Already delivered data cannot be recalled.
9. A durable job may execute after normal browser logout/expiry under its own
   bounded delegation, but that delegation never authenticates a download or
   saved-result read. Session-bound delivery stops; later retrieval needs a
   current caller credential/data policy. Test security-event/token/delegation
   revocation independently from ordinary session-expiry survival.

## Implementation work packages

### READ-01: Internal authorization-plan contract

- **Depends on:** completed DATA-01 (POLICY-03/04), feasibility evidence, and
  the reviewed internal executor trust contract. Resolver-only completion
  does not waive DATA-01 administration/audit acceptance.
- **Deliver:** typed validated plan and API/executor boundary, trusted issuance,
  binding/freshness checks, safe diagnostics, and revision invalidation.
- **Verify:** forged/missing/stale plans, subject/workspace/version substitution,
  credential mismatch, schema/attribute changes, and revocation races.
- **Gate:** reviewed transport/plan freshness; no client or AI override.

### READ-02: Mandatory executor input enforcement

- **Depends on:** READ-01 and POLICY-02 evidence. DATA-02 is parent coverage,
  not an additional completed prerequisite.
- **Deliver:** production row filtering/column projection before untrusted SQL,
  isolated authorized relations, raw staging removal, resource-limit handling.
- **Verify:** CTEs/joins/aliases/aggregates/`SELECT *`, denied predicate fields,
  raw/catalog/file access, errors, exact data outputs, and existing restrictions.
- **Gate:** representative performance/memory/spill/timeout results and executor
  review; prototype code alone does not satisfy this package.

### READ-03: Query, preview, and history integration

- **Depends on:** READ-02 and RBAC-06 token restrictions required by DATA-03.
- **Deliver:** common policy path for read-only SQL, current/pending/historical
  previews/versions, and caller filters; preserve workspace/resource checks.
- **Verify:** exact rows/columns for disjoint and overlapping same-role users,
  browser/token parity, old schemas, missing predicate columns, restrictive
  filters, and attempts to broaden scope.
- **Gate:** approved dataset/version ownership and historical metadata contracts.

### READ-04: Export and metadata integration

- **Depends on:** READ-02/03 and ASYNC-03 stream revocation. DATA-03 is parent
  coverage completed by READ-03/04, not a prerequisite of READ-04.
- **Deliver:** authorized CSV/Parquet generation and metadata/profile/sample/
  schema/statistic/count handling; remove restricted raw-file shortcuts.
- **Verify:** parse both export formats and compare exact rows/columns, including
  no denied values/headers; raw snapshot denial, metadata/error leakage,
  revocation during generation/delivery, and temporary-file cleanup.
- **Gate:** approved/measured export capacity and metadata semantics;
  unsupported paths explicitly deny.

## Engineering surfaces and handoff artifacts

Start with [dataset helpers](../../apps/api/src/datasets.ts),
[data routes](../../apps/api/src/routes/data.ts),
[generic resources](../../apps/api/src/app.ts),
[executor](../../services/executor), [shared contracts](../../packages/shared),
[SDK](../../packages/sdk), and [tests](../../tests).
The current Parquet raw-snapshot path requires explicit review; securing SQL
alone does not secure direct downloads.

Deliver the reviewed API/executor plan schema, freshness/trust design, a direct-
surface-to-helper/test map, authorized relation lifecycle, export/cleanup
contract, safe error/metadata rules, and measured performance evidence.

## Verification and definition of done

Use synthetic fixtures with two same-role users, disjoint/overlapping grants,
denied columns, no-grant subjects, and null/empty/missing attributes. Record
approved expected rows/columns for every fixture, including historical schemas.

- [ ] Unit/API/executor tests assert exact data and metadata, not merely 200/403.
- [ ] No raw relation, catalog, file, snapshot URL, alternate alias, or generic
      resource exposes denied inputs.
- [ ] Newly added columns default deny; missing policy/predicate inputs deny.
- [ ] Preview/query/history/CSV/Parquet and metadata enforce one current policy.
- [ ] Forged/stale plans and policy races deny before unauthorized execution.
- [ ] Streams stop within the approved bound and clean protected artifacts.
- [ ] Resource-limit/outage failures are explicit and safely observable.
- [ ] Workload/environment/budgets and measured impact are recorded.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser tests pass.

Follow [AGENTS.md](../../AGENTS.md); opt-in external database tests, production
data access, new software/browser installs need required approval.

## Deployment, disablement, and exclusions

Deploy direct-surface protections incrementally with restricted users disabled
until Phases 7-8 pass. Explicitly deny unsupported routes/formats rather than
return unrestricted results. A policy/executor failure is not permission to
retry without a plan. Disable affected features for containment; compatible
rollback must preserve policy enforcement and revision interpretation.

Excluded: restricted-user onboarding, full derived/ontology/dashboard/AI/write
coverage, broad data access inferred from workspace ownership, and cloud launch.
