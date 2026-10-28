# Phase 8: Restricted-data release

## Engineering handoff

- **Status:** planned release gate; no restricted-user rollout is approved here.
- **Backlog coverage:** DATA-07; RELEASE-01 through RELEASE-04.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Surface inventory:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Previous handoff:** [Phase 7](./PHASE-7-DERIVED-AI-WRITES.md).
- **Workspace-RBAC baseline:** [Phase 4](./PHASE-4-WORKSPACE-RBAC-PILOT.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-07/08 evidence and completed capabilities gate enablement; no approval exists.

## Expected outcome

An explicitly reviewed production release can serve users with the same
workspace role but different dataset/row/column access across every enabled
supported surface. Engineering and operators have reproducible correctness,
security, revocation, migration/restore, performance, and rollback evidence.
Unsupported surfaces/configurations deny access and are clearly documented.
The first release is read-only for restricted subjects: explicit dataset/
row/column read grants, no groups, no declassification, parent-bounded sharing,
and owner-managed policies with accepted audited self-grant risk.
All humans/user tokens in isolation-enabled workspaces are restricted, even
owners granted all data. No per-user business-write exemption exists. Normal
browser logout does not cancel valid bounded job delegations; current caller
authentication still gates every retrieval. Release guidance must explain
explicit job cancellation and browser-versus-token security-event effects.

## Entry criteria and release blockers

- DATA-07 requires DATA-03/04/05/06 plus RBAC-08/09. Earlier dependencies remain
  mandatory: approved semantics/feasibility, trusted policies/plans, complete
  direct/derived/AI/cache/write enforcement, and audited workspace RBAC.
- All enabled routes/jobs/callbacks/streams/artifacts must have traced policy
  enforcement and tests. The earlier 83-route inventory is a baseline, not
  proof that future registrations are covered.
- Declare representative workloads/environment, approved numeric budgets,
  supported policy/configuration matrix, rollout cohort, and responsible
  engineering/security/operator release approvers.
- Resolve material security findings and policy/recovery/operational blockers.
  Do not claim security review, performance, or capacity evidence before it exists.
- Cloud activation independently requires privileged MFA and reviewed hosting/
  network/TLS/proxy/storage/isolation/coordination/incident/restore design.
  Data-isolation completion does not approve Kubernetes deployment.

## Coverage and evidence contract

| Enabled surface | Required evidence |
| --- | --- |
| Identity, role, credential, policy administration | Current authority, browser-only ceilings, last-owner/admin invariants, durable redacted audit, no self-assigned attributes/plans |
| Query, preview, current/pending/history | Exact authorized rows/columns before untrusted SQL; no raw relation/catalog/plan bypass |
| CSV/Parquet, profiles, samples, schema/counts/statistics | Exact content and metadata; no raw snapshot shortcut or denied-value errors |
| Ontology, graph, pipelines, derived assets | Stable scope/provenance, both relationship endpoints, no widening through new IDs |
| Dashboards, Home, aggregates | Reader-policy recomputation; broader shared aggregates/declassification deny |
| AI/voice/tools/transcripts | Authorized context/results/errors; no authority gained from model output |
| Chats, saved answers, files, caches, generic resources | Creator privacy/sharing/quarantine plus current reader data scope; no broad-cache reuse |
| Jobs, callbacks, streams, downloads | Actor/service intent, current execution/commit/delivery checks, measured revocation/cleanup |
| Inserts, ingestion, overlays, edits, actions, bulk writes | Restricted data-changing intents deny before effects, including generated/mixed requests |

Unknown/unclassified outputs and unsupported surfaces deny. Documentation or
hidden UI alone is not enforcement. Shared content never declassifies its
source data. Platform/workspace/service authority gives no implicit bypass.

## Implementation work packages

### RELEASE-01: Coverage reconciliation

- **Depends on:** DATA-03 through DATA-06, current route/artifact inventory,
  RBAC-08/09.
- **Deliver:** reconciled coverage map for every enabled route, conditional
  intent, generic resource, job, callback, stream, and persisted artifact.
- **Verify:** registration tests detect new/unclassified routes, alternative paths
  enforce the same policy, unsupported features deny, and every surface maps
  to enforcement location and executable tests.
- **Gate:** approved inventory and complete traceability; no launch on sampled
  coverage or historical route counts.

### RELEASE-02: End-to-end isolation

- **Depends on:** RELEASE-01 inventory, Phase 6/7 integration, approved expected
  policy outcomes.
- **Deliver:** reproducible same-role/different-grant scenarios across direct/
  derived data, sharing, AI, exports/history, caches, writes, and revocation.
- **Verify:** exact rows/columns/metadata/artifacts, not just statuses/UI;
  disjoint/overlapping/absent grants, browser/token credentials, schema changes,
  policy races, private/shared/quarantined content, and streams.
- **Gate:** all enabled configurations/surfaces pass before restricted onboarding.

### RELEASE-03: Operational evidence

- **Depends on:** Phase 6/7 integration, approved budgets, RELEASE-01 scope.
- **Deliver:** deployment-like migration/restore, outage, revocation, resource-
  limit, performance/capacity, and backup consistency evidence.
- **Verify:** cross-replica stop/delivery latency, queued/running/commit races,
  audit/policy/store failure, caches/history, executor spills/timeouts, and
  compatible rollback that never drops protection.
- **Gate:** unknown workloads/budgets or unmeasured guarantees block release.

### RELEASE-04: Reviewed enablement

- **Depends on:** RELEASE-01 through RELEASE-03; deliver DATA-07 acceptance,
  workspace-RBAC and applicable cloud gates.
- **Deliver:** reviewed findings/dispositions, user/API/operations docs,
  supported configuration matrix, controlled rollout, monitoring, containment/
  rollback procedure, operator drill, and explicit release sign-off.
- **Verify:** project/browser checks, reproducible evidence, operators can stop
  affected protected-mode features without enabling unrestricted access.
- **Gate:** explicit approval before enablement; cloud sign-off is independent.

## Test design and release evidence package

Use versioned synthetic fixtures with exact expected outcomes for users sharing
a role but having different dataset/row/column grants. Include no/empty/null/
missing/conflicting attributes, denied fields, historical schemas, joins and
aggregates, shared/private content, and stale work after authority changes.
Do not use production personal data as a test shortcut.

The release record must identify:

1. Commit/build/configuration, supported policy cases, complete surface map,
   test selectors/results, and any explicitly disabled capabilities.
2. Workload/environment/API/worker/replica topology, approved budgets, measured
   latency/resource/capacity results, and known limitations.
3. Revocation measurements starting at durable revocation commit: subsequent
   checks deny and affected work/streams stop within 5 seconds. There is no
   atomic-commit exception; disabled operations must be listed.
4. Security/dependency review findings and resolution, safe audit/redaction
   evidence, and cloud readiness approval where applicable.
5. Migration/backup/restore and failure-drill results, compatible rollback
   versions, post-backup loss/credential-resurrection risks, and operator steps.
6. Named approvers/decision date, rollout cohort/gates, monitoring and approved
   stop thresholds, support/incident ownership, and final enablement decision.

Do not include credentials, cookies, keys, proof links, private content, or
protected values in the evidence package.

## Engineering surfaces

Reconcile [API](../../apps/api), [executor](../../services/executor),
[web](../../apps/web), [shared contracts](../../packages/shared),
[SDK](../../packages/sdk), [tests](../../tests), and
[documentation](../../docs) against the inventory and actual registrations.
This phase verifies integrated behavior; it is not permission to patch gaps
with UI-only checks or output filtering.

## Definition of done and operational rollout

- [ ] RELEASE-01 through RELEASE-04 meet all gates for enabled configurations.
- [ ] DATA-00 through DATA-07 (DATA-06 is write-denial scope) and workspace-RBAC prerequisites are traceable
      to approval, implementation, and test evidence.
- [ ] Exact-content isolation and 5-second revocation pass across all surfaces.
- [ ] The lifecycle matrix proves normal logout/expiry job survival without
      session delivery, security-event browser-job revocation, originating
      token expiry/revocation, immutable job deadlines and explicit cancellation.
- [ ] Global disablement cannot eliminate last active owner/admin; verified
      email change revokes old pending invites and only owners may reissue.
- [ ] All isolated-workspace humans/tokens remain read-only for business data
      despite ownership, broad grants, or policy edits.
- [ ] Unsupported cases are denied and documented, not silently unrestricted.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser suites pass.
- [ ] Security review, measured budgets, operational drills, docs, and explicit
      engineering/security/operator sign-off are recorded.
- [ ] Independent cloud/MFA gates pass if the release is cloud-hosted.

Follow [AGENTS.md](../../AGENTS.md). Approve actual migrations, service
interruptions, restores, software installs, and other disruptive actions
separately. Never expose the current local-only installation as a shortcut.

Roll out only the approved configurations/cohort; monitor against declared
thresholds and expand only after reviewed results. On isolation, audit, or
revocation failure, deny affected operations or disable features/traffic.
Never disable authorization, revert to no-login shared access, serve raw/global
results, or silently broaden grants for availability. Restore requires
compatible code, matching backup/encryption configuration, approval, and a
protected access boundary.

Excluded: unrestricted enablement, arbitrary policy SQL/custom roles,
inference-proof analytics claims, groups, broader aggregate declassification,
fine-grained restricted-write enablement, and cloud infrastructure provisioning.
