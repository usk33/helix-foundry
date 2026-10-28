# Phase 4: Background authorization and workspace-RBAC pilot

## Engineering handoff

- **Status:** planned release gate; no pilot/public exposure is authorized here.
- **Backlog coverage:** RBAC-07, RBAC-09; ASYNC-01 through ASYNC-04.
- **Source of truth:** [master backlog](../RBAC-IMPLEMENTATION.md).
- **Route contract:** [route-policy inventory](../RBAC-ROUTE-POLICY.md).
- **Adjacent handoffs:** [Phase 3](./PHASE-3-AUDITED-ADMINISTRATION.md),
  [Phase 5](./PHASE-5-DATA-POLICY-FOUNDATION.md).
- **Readiness:** [decision, dependency, and contract ledger](./IMPLEMENTATION-READINESS.md).
  C-04/07/08 and mapped prerequisites remain required; no pilot evidence exists.

## Expected outcome

Workspace RBAC is ready for an explicitly approved controlled pilot: jobs,
callbacks, live sessions, downloads, and publication enforce current authority,
not just enqueue-time roles. Operators have reviewed release evidence,
monitoring, dependency-failure diagnostics, and disable/rollback procedures.
This milestone does not provide row/column isolation.

## Entry criteria and unresolved gates

- RBAC-07 requires RBAC-03/04; RBAC-09 requires completed RBAC-02 through
  RBAC-08, including durable audit foundation transitively.
- Phase 1 authentication, Phase 2 full route/resource authorization and
  migration validation, and Phase 3 audited lifecycle must integrate.
- Inventory all durable actors, job intents, callbacks, streams, persisted
  results, and service-job authorities, including existing queued work.
- Approve revision/fencing/cancellation and multi-replica/worker coordination.
  Do not assume the current single-worker deployment can simply be scaled.
- C-04 must implement bounded durable manual-job delegation per the
  [lifecycle contract](./IMPLEMENTATION-READINESS.md#second-pass-lifecycle-contract);
  numeric maximum lifetime/deadline, scheduled-service intents, legacy queues,
  and external boundaries still need engineering contracts. Cancellation cannot recall
  an accepted remote action; unsafe operations remain disabled rather than
  promising local commit fencing covers remote systems.
- Declare workload/environment and numeric migration/authorization budgets;
  hashing/mail capacity and detailed outage/retry contracts remain release gates.
- A cloud pilot independently requires privileged MFA, reviewed infrastructure/
  TLS/proxy/private-service/storage/security design, and named operator readiness.
  Kubernetes direction is not launch approval or infrastructure scope here.

## Mandatory execution and revocation contract

1. Persist stable actor identity, credential ceiling, workspace, operation intent,
   input references/revisions, and narrowly scoped service authority where
   applicable. Manual jobs atomically receive a job-bound delegation with
   original credential kind/ID, immutable hard expiry no later than the job
   deadline, and original grant ceiling. An owner role snapshot is not authority.
2. Reauthorize at dequeue, retry, resolved-intent change, privileged side effect,
   commit, and protected retrieval/delivery boundaries.
3. User-requested work remains constrained by current user/credential authority.
   Normal browser logout/session expiry does not end a previously issued valid
   job delegation. It does end that session and its delivery. Delegation cannot
   log in, authenticate downloads/management, start another job, or refresh
   privilege. Current account/membership/grants/policy remain mandatory.
   Scheduled/system work without a human actor needs explicit narrow service
   intent and tests; never inherit broad owner/data bypass.
4. After revocation commits, subsequent checks deny; affected ongoing work/
   delivery must safely stop within 5 seconds across replicas. There is no
   atomic-commit exception. Sending a cancel request is not proof of stopping.
5. Operations unable to prove safe completion/stop within the bound stay disabled.
   Test revoke immediately before and during commit, not just before enqueue.
   Already completed commits/delivered data are not retrospectively recalled;
   subsequent effects and retrieval still require current authority.
6. Explicit cancel/delegation expiry, account disablement, rights/policy loss,
   workspace state, sharing/unsharing and quarantine stop affected work.
   Originating API-token revoke/expiry also stops its job. Password reset/
   change and verified email change revoke browser-origin delegations and
   sessions; preserve valid token-origin authority under current rights.
   Logout/expiry terminate session-bound delivery, not independently delegated
   execution. No silent job extension or service-authority conversion.
7. Identity/session/permission outages fail closed. Privileged changes need
   durable audit; bounded retries must be idempotent and operator-visible.
8. Add an explicit authorized cancel-my-active-jobs control, separate from
   logout, respecting creator privacy and no implicit owner/admin moderation.
   Reopening a job/result always requires a current caller credential and
   current resource/data permission, even when execution survived logout.

## Implementation work packages

### ASYNC-01: Actor and service authority

- **Depends on:** RBAC-03/04, ACCESS-01, approved service-job intent contracts.
- **Deliver:** actor/credential/intent/revision propagation through manual and
  scheduled jobs, callbacks, assistant runs, live work, and existing queue
  migration; bounded one-job delegation issuance/expiry/revocation. Separate
  service, session, and delegated human authority explicitly.
- **Verify:** missing/stale actor denial, no role inheritance/escalation,
  credential/workspace mismatch, changed resolved intent, and narrow service
  regressions across retries.
- **Gate:** complete durable/job callback inventory and legacy queue handling.
  C-04 must supply numeric delegation maximum/deadline, queue/retry clock rules,
  eligible privileged intents, and account-security/factor-event effects.
  Browser-bound callbacks never accept job delegation as session proof.

### ASYNC-02: Execution and commit enforcement

- **Depends on:** ASYNC-01, durable audit integration, strict revocation contract.
- **Deliver:** current-authority guards at execution/commit, revision fencing,
  effective cancellation/cleanup, consistent terminal state, and diagnostics.
- **Verify:** barrier-controlled races at dequeue, execution, pre-commit,
  during commit, and after completed commit. Assert durable side effects and
  safe stop latency, not merely a cancelled status or HTTP response. Contrast
  ordinary logout/expiry survival with cancellation/security-event/delegation/
  token-expiry stopping; prove no original-grant ceiling escalation on promotion.
- **Gate:** no enabled operation without measured compliance; approve atomicity/
  coordination design rather than weakening the 5-second requirement.

### ASYNC-03: Streams and live-session revocation

- **Depends on:** ASYNC-01, ACCESS-03 visibility, session/token revocation contracts.
- **Deliver:** current-access checks and termination for SSE, CSV/Parquet
  downloads, provider/model streams, voice, and saved-result delivery.
- **Verify:** revoke at controlled delivery checkpoints with replica delay and
  dependency outages; assert no further protected delivery past the bound,
  stopped underlying work, and cleaned temporary resources.
- **Gate:** define observable delivery/cancellation boundaries and artifact
  retrieval checks; already delivered bytes cannot be recalled.

### ASYNC-04: Release evidence and pilot

- **Depends on:** ASYNC-02/03, completed RBAC-02 through RBAC-08, required project/
  browser checks.
- **Deliver:** integrated security/dependency review, migration/restore rehearsal,
  fault drills, metrics/alerts, docs, and reviewed pilot enable/disable plan.
- **Verify:** role/credential/route matrix, deterministic auth/mail/browser flows,
  audit failure, cancellation races, and measured workload-budget results.
- **Gate:** MFA/cloud review, capacity/mail evidence, unresolved findings, and
  operational sign-off must pass before applicable enablement.

## Engineering surfaces and handoff artifacts

Start with [jobs](../../apps/api/src/jobs.ts),
[setup jobs](../../apps/api/src/setup-jobs.ts),
[worker](../../apps/api/src/worker.ts),
[hosting callbacks](../../apps/api/src/hosting.ts),
[onboarding](../../apps/api/src/onboarding.ts),
[route modules](../../apps/api/src/routes), and
[executor](../../services/executor). Include publication, rollback, setup build/
confirmation/resume, imports, pipelines, assistant tools, and result downloads.

Deliver a boundary inventory mapping each operation to actor/intent, enqueue/
execution/commit/retrieval guards, stop mechanism, audit, race tests, and measured
latency. Record workload/environment, approved budgets, results, unsupported
disabled operations, and security findings with disposition.

## Verification and definition of done

- [ ] Every enabled async/stream surface has explicit actor/service authority.
- [ ] Delegated jobs survive only ordinary browser logout/expiry within their
      immutable deadline and current authority. They never authenticate
      retrieval, browser callbacks, another job, or service scheduling.
- [ ] Browser security changes revoke browser-origin delegations; preserved
      API-token-origin jobs still stop at token expiry/revocation/authority loss.
      Explicit cancel-my-jobs is separate from logout and respects privacy.
- [ ] Cross-replica revocation tests meet the 5-second bound with no commit
      exception; timing starts at durable revocation, not UI acknowledgement.
- [ ] Queued/running work and protected artifacts cannot outlive required access.
- [ ] Authentication/session/audit/permission outages exercise documented denial,
      retry, operator alerts, and recovery without silent privilege fallback.
- [ ] Representative migration/backup/restore and compatible rollback rehearsed.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, relevant browser tests pass.
- [ ] Security/dependency review, supported-mode docs, monitoring, budget
      measurements, and named release/operator approval are recorded.

Use fake clocks/barriers for deterministic races plus deployment-like
multi-replica timing tests. Follow [AGENTS.md](../../AGENTS.md); live migrations,
restores, downloads/installs, and disruptive actions need separate approval.

## Deployment and rollback boundary

Enable a limited workspace-RBAC pilot only after all enabled surfaces meet
authentication, authorization, privacy, audit, and revocation criteria.
Do not put users with different data-access requirements in the same workspace
or promise differentiated rows/columns before Phase 8.

Stage rollout using an explicit reviewed gate; observe authorization/audit/
revocation failures against approved thresholds. On failure, stop affected
features or collaborative traffic while preserving controls and state. Never
switch a shared deployment to unauthenticated local-owner mode. Restore only
with approval, compatible code/matching backup, and an isolated access boundary.

Excluded: public exposure by implication, Kubernetes provisioning, data-policy
isolation claims, and any operation that cannot safely meet strict revocation.
