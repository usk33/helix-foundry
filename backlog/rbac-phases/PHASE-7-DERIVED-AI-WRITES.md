# Phase 7: Derived data, AI, and writes

## Engineering handoff

- **Status:** planning depth; DATA-00 semantics and Phase 6 enforcement are gates.
- **Backlog coverage:** DATA-04, DATA-05, DATA-06; SCOPE-01 through SCOPE-05.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Surface inventory:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 6](./PHASE-6-DIRECT-DATA-PROTECTION.md),
  [Phase 8](./PHASE-8-RESTRICTED-DATA-RELEASE.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-06 and completed READ/ASYNC prerequisites gate coding; launch remains off.

## Expected outcome

Data restrictions survive pipelines/materialization, ontology/graph, dashboards,
AI/voice, cached/saved outputs, and asynchronous delivery. Restricted-subject
data writes explicitly deny; fine-grained write enablement is deferred.
Resource visibility alone never grants broader source-data access.
Restricted-data launch remains off.

## Entry criteria and unresolved contracts

- DATA-04 requires DATA-03. DATA-05 additionally requires RBAC-07;
  DATA-06 requires DATA-04.
- Phase 5 approves lineage, read-only scope, deferred declassification,
  policy authority, and revision rules; Phase 6 implements trusted plans and
  mandatory authorized direct inputs.
- Phase 4 provides actor/service authority and strict revocation/commit fencing;
  Phase 3 provides durable audit.
- Approve provenance/authorization attributes, derived-output classification,
  artifact ownership/sharing/retention, stale-result reject/recompute rules,
  and transcript/context handling before affected implementation.
- Specify classification of every read versus data-changing intent and assert
  denial before write effects, including mixed/generated operations.
  All humans/user tokens in an isolation-enabled workspace are restricted;
  owners cannot remove this classification by broadening their policy.
  Fine-grained write semantics are future scope; workload/environment and
  numeric performance budgets remain required.

## Mandatory propagation and write contract

1. Restricted inputs produce restricted outputs by default. Preserve provenance
   or stable authorization attributes through rename/materialization/aggregation.
   Unknown lineage/classification denies, not broadens.
2. Explicit service authority may compute global materialization but cannot be
   used to serve global output to ordinary readers. No implicit owner/service/
   platform-admin bypass.
3. Opening a dashboard/workspace is not a grant to global metrics. Recompute
   for the reader. Broader shared aggregates and declassification are deferred and
   must be denied, not inferred from owner policy-administration authority.
4. Apply policy to record IDs, properties, overlays, edges, both relationship
   endpoints, graph search/traversal, counts, links, dashboards, and Home metrics.
5. AI/voice may receive only authorized schema, samples, retrieved context,
   tool queries/results/errors, and transcript references. Model-generated
   intent/output cannot grant authority. Local models have the same controls
   as hosted models; sensitivity flags are not data policies.
6. Cache identity includes workspace, input versions/query, policy revision, and
   effective-access fingerprint including subject attributes. Reauthorize
   retrieval: cache partitioning alone is insufficient.
7. Saved answers/files/jobs/transcripts must satisfy both resource privacy and
   current reader data policy. Creator sharing never declassifies inputs.
   Changes in membership/attributes/policy/token invalidate stale delivery.
8. Restricted-subject data-changing intents deny, even for editor/owner roles:
   ingestion, inserts, overlays, reverts, generated actions, relationship and
   bulk writes. UI hiding is not enforcement. Owner policy management is a
   separate browser-only audited control-plane operation, not a data write grant.
9. Mixed requests cannot partially apply data writes. Deny before effects and
   keep intentional unrestricted/local behavior separately tested. If a future
   release enables restricted writes, it must approve editable fields, old/new
   rows, endpoints, atomicity/idempotency, and policy/input revision rules first.
10. Subsequent checks deny after committed revocation; ongoing work/streams
    stop safely within 5 seconds, with no atomic-commit exception. Unsupported
    operations stay disabled. Previously delivered data cannot be recalled.
11. Apply the [delegation lifecycle matrix](./IMPLEMENTATION-READINESS.md#lifecycle-acceptance-matrix)
    to asynchronous outputs: ordinary logout/expiry ends session delivery but
    valid job-bound execution may continue. Password/email security changes
    revoke browser-origin jobs; token jobs require the still-valid originating
    token/current rights. Reopening cached/saved outputs needs a current caller
    credential; delegation never authenticates retrieval.

## Implementation work packages

### SCOPE-01: Provenance and lineage

- **Depends on:** READ-03/04 (completed DATA-03) and approved DATA-00 lineage/
  parent-bounded sharing with declassification deferred.
- **Deliver:** provenance or stable authorization attributes for pipelines,
  derived datasets, global materialization, and classified outputs.
- **Verify:** renamed/new IDs never broaden scope; uncertain classification
  denies; service-produced data does not inherit service read authority.
- **Gate:** approved lineage; no broader aggregate/declassification path enabled.

### SCOPE-02: Ontology and dashboards

- **Depends on:** SCOPE-01. DATA-04 is parent coverage, completed by SCOPE-01/02.
- **Deliver:** policy-aware records/properties/overlays/relationships/graph,
  search/traversals/counts, dashboards/metrics and reader-specific aggregates.
- **Verify:** direct IDs and indirect paths return exact authorized properties/
  objects/edges/counts; both endpoints checked; opening dashboard reveals no
  global aggregate by default.
- **Gate:** approved reader recomputation model; missing lineage
  must deny rather than infer audience.

### SCOPE-03: AI and voice context

- **Depends on:** SCOPE-02, ASYNC-02/03. DATA-05 is parent coverage shared with
  SCOPE-04, not a completed prerequisite.
- **Deliver:** authorized model context/tools/results/errors, voice/transcript
  retrieval, and generated-action boundaries for hosted/local models.
- **Verify:** capture deterministic mock-model context for narrow/wide readers;
  test shared conversations, tool intent changes, voice references, model/tool
  errors, and denied data in prompts/results/transcripts.
- **Gate:** reviewed source/context provenance and transcript retention/retrieval.

### SCOPE-04: Caches and persisted work

- **Depends on:** SCOPE-02, ASYNC-02/03; coordinate AI artifacts with SCOPE-03.
- **Deliver:** effective-access cache keys, artifact classification, and current
  authorization for saved answers/files, async outputs, and downloads.
- **Verify:** warm cache as broad user then read as narrow user; revoke/change
  grants/attributes/credentials mid-flight; assert no stale delivery and
  measured cancellation/cleanup within the bound. Include ordinary browser
  logout with execution survival but no session delivery/retrieval; password/
  email security changes and token expiry must revoke the affected work.
- **Gate:** ownership/sharing and reject/recompute contracts; never trust only
  partition keys or enqueue-time grants.

### SCOPE-05: Restricted-write denial and future-write boundary

- **Depends on:** SCOPE-02 and approved read-only scope. DATA-06 is parent
  coverage, not a prerequisite of SCOPE-05.
- **Deliver:** central intent-based denial for restricted-subject data writes,
  direct/generated/ingestion/relationship/bulk coverage, safe UI errors, and
  explicit future-write contracts requiring separate approval.
- **Verify:** an editor with restricted grants cannot mutate through any API,
  tool, resumed job, ingest, revert, overlay, or mixed request; assert no
  business/file/job/external write effects, including retry/race paths.
  Read-only query/answer/artifact persistence remains possible only under
  reviewed privacy/current-data-scope controls, not blanket HTTP-POST denial.
- **Gate:** no restricted-write enablement in this release. Owners may manage
  policy via the approved control plane, but cannot bypass data-write denial
  with role alone. Preserve intended unrelated local/unrestricted behavior.

SCOPE-03, SCOPE-04, and SCOPE-05 can progress independently after their actual
prerequisites. Their numeric order is not an extra dependency. DATA-05 is not
complete until both AI and cache/persisted/asynchronous coverage are integrated.

## Engineering surfaces and handoff artifacts

Start with [ontology routes](../../apps/api/src/routes/ontology.ts),
[analyst/live routes](../../apps/api/src/routes/analyst.ts),
[pipeline routes](../../apps/api/src/routes/pipelines.ts),
[workspace/Home](../../apps/api/src/routes/workspace.ts),
[jobs](../../apps/api/src/jobs.ts), [generic resources](../../apps/api/src/app.ts),
[web app](../../apps/web), and [executor](../../services/executor).
Trace to underlying helpers/artifact stores during implementation; route-only
guards are not sufficient for stored or service-produced data.

Deliver lineage/classification schemas, reader-policy propagation design,
model context/tool boundaries, cache/artifact fingerprint and invalidation
contracts, read/write intent classification, exact fixture outputs, and per-surface
coverage/evidence.

## Verification and definition of done

Use same-role users with disjoint/overlapping/absent grants and explicit exact
expected direct/derived outputs. Include shared/private/quarantined content,
service-generated artifacts, old schemas, and policies changed mid-execution.

- [ ] Derived IDs, materialization, graph traversal, metrics, and aggregates
      never widen access; broader sharing/declassification explicitly denies.
- [ ] Mock AI/voice inputs/outputs/errors/transcripts contain no denied data.
- [ ] Broader-user caches/files/answers cannot be served to narrower users.
- [ ] Membership/attribute/policy/token changes invalidate delivery and stale work.
- [ ] Every restricted data-changing intent denies before effects, including
      direct/generated actions, ingestion, relationship changes, and bulk input.
      Read-only analysis/artifact persistence has reviewed safe semantics.
- [ ] All isolated-workspace humans/tokens, including full-read-grant owners,
      remain write-restricted; no client flag, role, or policy update evades it.
- [ ] Cross-replica revocation/commit/stream races meet the strict bound.
- [ ] Unsupported surfaces deny explicitly; diagnostics/audit contain no secrets
      or protected values.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser tests pass;
      resource/workload results recorded against approved budgets.

Follow [AGENTS.md](../../AGENTS.md). Prefer deterministic models and isolated
stores; real hosted-model calls/private data and opt-in database tests require
appropriate configuration/approval.

## Deployment, disablement, and exclusions

Deploy coverage incrementally with restricted-user launch disabled until Phase 8.
On missing lineage, stale policy, or integration failure, deny affected surfaces
or disable features; do not serve global caches, raw results, or service-authority
output as a fallback. Compatible rollback must preserve classification,
invalidation, and write protections; restore requires separate approval.

Excluded: restricted-user enablement, automatic inference-proof analytics,
implicit moderation/ownership transfer, unreviewed declassification, and
cloud infrastructure/launch approval. Full row/column write enablement is
deferred beyond this first release, not silently counted as implemented.
