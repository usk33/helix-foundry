# Phase 5: Data-policy foundation and executor proof

## Engineering handoff

- **Status:** planning depth; DATA-00 and executor feasibility are unresolved.
- **Backlog coverage:** DATA-00, DATA-01, bounded DATA-02 prototype;
  POLICY-01 through POLICY-04.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Surface inventory:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 4](./PHASE-4-WORKSPACE-RBAC-PILOT.md),
  [Phase 6](./PHASE-6-DIRECT-DATA-PROTECTION.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  Candidate semantics may be contracted now; final DATA-00/C-05 and feasibility
  gate resolver implementation. No production proof exists.

## Expected outcome

Engineering has approved dataset/row/column policy semantics, trusted subject
assignments, a versioned resolver, and feasibility evidence that the executor
can expose only authorized relations to untrusted SQL. Policy infrastructure
may deploy disabled; no restricted users are enabled by this phase.

## Entry criteria and decisions to resolve

- DATA-00 requires RBAC-00/01. DATA-01 requires completed DATA-00 plus
  RBAC-02/03/04. Original dependencies apply even if design/prototype work
  overlaps other phases.
- Workspace roles authorize operations; data policy independently constrains
  datasets/rows/columns. A sensitivity flag for AI is not data authorization.
- Use explicit per-subject dataset grants with owner-managed trusted attributes;
  no groups/inherited grants in this release. C-05 defines typed equality/
  set-membership, type/null/empty behavior, schema/history/errors/metadata.
- Owners have `data_policies.manage` through browser-only operations with
  reauthentication within 5 minutes, durable audit and revision invalidation.
  The user accepted owner self-grant risk; no two-person approval is required.
  Owners/admins/service jobs still have no implicit data-read bypass.
- No declassification or broader shared aggregates initially; recompute for
  the reader. Row/column filtering is not inference-proof analytics.
- Restricted subjects are read-only. Phase 7 implements explicit write-intent
  denial; full row/column write enablement is deferred for separate approval.
  Restricted means every human account/user token in an isolation-enabled
  workspace, including owners with full explicit read grants. No per-user
  unrestricted writer or role/policy-update exemption exists.
- Declare workload/environment and query/export/resolver budgets; approve
  freshness/invalidation with the existing strict 5-second revocation rule.
- Select atomic persistence/revision and effective-access fingerprint contracts.

These are decisions/evidence to obtain, not permission to fill gaps with
permissive defaults or invent new approved policy semantics.

## Required policy behavior

1. Explicit dataset grants and trusted subject attributes determine access.
   Missing grants/attributes, malformed/conflicting policy, unknown columns,
   stale plans, or unverifiable state deny with safe actionable diagnostics.
2. Column allowlists deny newly introduced fields by default; schema changes
   never silently widen access. Define treatment of old schemas and absent
   predicate columns; absent required columns must deny.
3. Query/model payloads cannot set security attributes or trusted execution plans.
   Authorized owners may update assignments only through the audited management
   path, including an explicit self-grant under the accepted risk.
   Use typed validated policies; no arbitrary policy SQL/custom masking engine.
4. Filter rows/project columns before untrusted SQL and remove accessible raw
   staging, alternative catalogs/files, and broad relations. Optional caller
   filters may only narrow mandatory policy.
5. Policies apply to browser sessions and API tokens; credential ceilings may
   narrow but never broaden data scope.
6. Restricted inputs produce restricted derived outputs; workspace sharing is
   not a data grant. Children are parent-bounded and not independently shared;
   deny/recompute unprovable saved outputs. Declassification is deferred.
7. All restricted-subject data writes deny, including ingestion/record changes/
   generated actions; editor role is not a write exemption. Future enablement
   needs approved editable fields, old/new row rules, and atomicity.
8. Version/invalidate on membership, attribute, token, or policy change.
   Current access must be rechecked at execution/retrieval/delivery boundaries.
9. Local compatibility migration is explicit/tested; never invent broad grants
   for new collaborators.
   Workspace isolation classification is server-controlled; policy broadening
   cannot disable it. Explicit local/pre-isolation compatibility is separate,
   not a fallback when policy fails. Service ingestion/materialization needs
   separately reviewed narrow authority, never human-owner impersonation.
10. Conditions are AND-combined within a grant; multiple row scopes are OR-
    combined only with an identical column allowlist for a subject/dataset.
    Reject conflicting authoring; deny malformed/stale conflicting policy.
    No independent union of all rows and columns. The
    [acceptance fixture](./IMPLEMENTATION-READINESS.md#concrete-data-policy-acceptance-fixture)
    specifies exact sample outputs.

## Implementation work packages

### POLICY-01: Policy semantics and expected cases

- **Depends on:** RBAC-00/01 and approved workspace/private-content principles.
- **Deliver:** candidate DATA-00 specification for the approved bounded
  read-only model, trusted subjects, conflicts, schema/history, owner
  administration, reader aggregates, and deferred declassification/writes.
- **Verify:** a concrete same-role case matrix with disjoint/overlapping/absent
  grants and explicit row/column outcomes; include owner/service non-bypass.
- **Gate:** final DATA-00 approval includes POLICY-02 feasibility evidence;
  candidate semantics can drive the prototype before final approval.

### POLICY-02: Bounded isolated executor proof

- **Depends on:** candidate POLICY-01 semantics and synthetic input/policy
  fixtures, not a production resolver or production restricted users.
- **Deliver:** isolated prototype demonstrating pre-SQL authorized relations,
  removal of raw staging, and preserved file/network restrictions.
- **Verify:** raw-table references, catalog discovery, aliases, joins, hidden-
  column predicates, schema changes, memory/spill/timeout behavior.
- **Gate:** review feasibility before closing DATA-00 or broad management UI
  work. Prototype evidence is not DATA-02 production enforcement.

### POLICY-03: Versioned persistence and resolver

- **Depends on:** completed POLICY-02 and ACCESS-05; final DATA-00 approval
  including feasibility evidence. DATA-01 is parent coverage, not a prerequisite
  of its own implementation.
- **Deliver:** validated policy/assignment schemas, trusted subject-attribute
  storage (no groups initially), policy revisions, effective resolver,
  fingerprint/invalidation, and deny-by-default migration.
- **Verify:** missing/malformed/conflicting assignments, historical schema,
  revision races, stale subject attributes, and explicit local compatibility.
- **Gate:** atomic updates/revision contract approved; no permissive failure path.

### POLICY-04: Policy administration and audit

- **Depends on:** POLICY-03, reviewed feasibility, RBAC-08A/08 audit integration,
  approved policy-admin authority.
- **Deliver:** approved management APIs/UI for policies/trusted assignments,
  safe audit hooks, SDK/OpenAPI contracts, and validation diagnostics.
- **Verify:** query/model attributes/plans cannot override server authority;
  viewer/editor/token/stale-reauth administration denies; explicit owner
  self-grant is audited/revisioned and invalidates caches/work. Declassification
  routes/intents deny; no protected values in audit/errors.
- **Gate:** reviewed owner browser/reauth contract; no incomplete administration
  or implied unrestricted read access.

### Dependency sequencing

Candidate semantics -> synthetic feasibility proof -> final DATA-00 approval ->
production policy persistence/resolver -> approved administration. Do not
require POLICY-03 for POLICY-02: that would create a circular prerequisite.
Phase 6 implements production executor enforcement.

## Engineering surfaces and handoff artifacts

Start with [shared contracts](../../packages/shared),
[API](../../apps/api), [datasets](../../apps/api/src/datasets.ts),
[executor](../../services/executor), [web app](../../apps/web), and
[SDK](../../packages/sdk). Inspect existing stores/executor protections before
choosing a module layout.

Deliver:

- Approved semantics/case matrix and outstanding decision dispositions.
- Synthetic dataset/policy fixtures with deterministic exact expected rows/
  columns, including null/empty/missing attributes, overlap, and deny cases.
- Feasibility code/results and limitations, clearly labelled non-production.
- Policy/assignment/revision/plan contracts, resolver API, invalidation design,
  management authority and audit schema, migration rules.
- Declared workload/environment, approved numeric budgets, measured prototype
  resource results, and unresolved production performance risks.

## Verification and definition of done

- [ ] DATA-00 approved, including executor feasibility and administration rules.
- [ ] Same-role/different-grant tests assert exact data, not only status codes.
- [ ] Prototype cannot reach raw or denied inputs through alternate relations.
- [ ] Resolver handles malformed/missing/conflicting/stale policy by denial.
- [ ] Schema additions do not broaden column allowlists; historical rules clear.
- [ ] Query clients/AI cannot forge attributes/plans; explicit owner management
      is audited/revisioned, with no implicit owner/service read bypass.
- [ ] Administration is audited with approved authority and safe diagnostics.
- [ ] Trusted workspace isolation classifies all humans/tokens as read-only;
      granting all rows/columns or owner role does not enable business writes.
- [ ] Production implementation changes pass `pnpm typecheck`, `pnpm test`,
      `pnpm build`, and relevant browser tests.

Synthetic fixtures need no production data. Follow [AGENTS.md](../../AGENTS.md)
and obtain approval for installs or external-database tests.

## Deployment, disablement, and exclusions

Deploy policy infrastructure with restricted-user access disabled. Keep the
workspace-RBAC pilot within its existing supported audience; do not onboard
different data audiences in one workspace yet. If feasibility fails, stop and
revise the design; do not substitute output-only filtering or a UI restriction.
Preserve policy revisions/state during compatible rollback; fail closed if an
older component cannot interpret a policy.

Excluded: production executor enforcement, restricted-user rollout, full
direct/derived/AI/write coverage, arbitrary policy SQL, custom roles, and cloud
infrastructure. Later phases remain planning-depth until these gates resolve.
