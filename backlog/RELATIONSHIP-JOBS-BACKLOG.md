# Relationship publication jobs backlog

Status: parked for future implementation. This document does not authorize implementation or deployment.

Created: 2026-10-27

## Goal

Move relationship-rule publication out of the browser's long-running HTTP request into durable background jobs. Keep the existing graph usable until its replacement is complete, expose meaningful progress, and reduce contention with interactive queries.

Background execution improves responsiveness but does not guarantee zero UI impact: publication and interactive requests still share database CPU, memory, and disk.

## Current behavior

- The relationship form waits for the publication API to finish.
- The publication endpoint directly awaits `publishProposal`.
- Automatic relationship refresh already uses durable `relationship_refresh` jobs.
- Publication stages a replacement graph before activating it.
- The single worker serves workspaces round-robin after claimed jobs, but a long-running job still occupies it until completion.

Relevant implementation:

- [Relationship form](../apps/web/src/relationship-rule-form.tsx)
- [Publication endpoint](../apps/api/src/routes/workspace.ts)
- [Publication implementation](../apps/api/src/assistant.ts)
- [Automatic relationship refresh](../apps/api/src/relationship-rules.ts)
- [Worker scheduling](../apps/api/src/jobs.ts)
- [Operations guide](../docs/OPERATIONS.md)

## Intended workflow

1. User defines or edits a relationship and previews full-data matching results.
2. User chooses **Apply in background**.
3. API durably queues publication and returns a job identifier immediately.
4. Dialog closes; the existing graph remains available.
5. Worker validates, builds, and atomically activates the new graph.
6. Ontology shows persistent progress and reports success or actionable failure.
7. Browser refresh or closure does not interrupt publication.

Rule removal follows the same workflow. Manual link/removal overrides retain their existing semantics.

## Phase 1: durable publication and visible progress

Priority: high. Deliver this before optional scheduled execution.

- [ ] Reuse existing job, lease, retry, and publication mechanisms rather than introducing a separate queue.
- [ ] Queue user-requested relationship publication durably; return `202 Accepted` with a job ID and status location after the enqueue transaction commits.
- [ ] Define a typed job/status response and update the SDK, UI, API documentation, and directly affected callers.
- [ ] Decide whether to add an asynchronous endpoint or explicitly opt into asynchronous behavior on the existing endpoint. Preserve existing synchronous API callers unless a documented compatibility change is approved.
- [ ] Persist proposal ID, confirmed hash, actor, and relevant generation/version references.
- [ ] Make repeated submissions and transport retries return the same logical operation instead of starting duplicate rebuilds.
- [ ] Enforce one active graph publication per workspace across manual publication, automatic relationship refresh, and other publication paths. Do not rely solely on having one worker: API requests can publish concurrently.
- [ ] Recheck permissions, confirmed proposal hash, active generation, source versions, and cancellation before activation.
- [ ] Keep existing atomic activation: a failed operation must leave the previous graph intact.
- [ ] Recover safely after worker interruption, including interruption after activation but before job completion is recorded.
- [ ] Close the form after successful enqueue and show persistent status on Ontology.
- [ ] Show queued, validating, building, activating, completed, failed, and canceled states as supported by actual execution.
- [ ] Report measured counts, elapsed time, last progress time, and useful errors. Do not invent progress percentages.
- [ ] Define safe cancellation boundaries; cancellation must not roll back an already activated graph or report success for work that was not canceled.
- [ ] Provide retry and explicit revalidation/review actions for stale proposals.
- [ ] Refresh graph queries after successful activation and restore status after browser reload.

### Phase 1 acceptance tests

- [ ] A 100,000-record relationship publication returns after durable enqueue, not after graph construction.
- [ ] Closing the dialog, navigating away, or refreshing the browser does not lose the operation.
- [ ] Duplicate clicks and HTTP retries do not duplicate publication.
- [ ] Concurrent manual and automatic publication cannot overwrite one another silently.
- [ ] Source or ontology changes while queued produce safe revalidation or an actionable stale-proposal result.
- [ ] Revoked permissions block execution/activation.
- [ ] Restart tests cover queued, mid-build, and activated-but-not-yet-acknowledged operations.
- [ ] Failure and cancellation preserve the last valid graph and expose accurate status.
- [ ] Existing cardinality checks, manual overrides, relationship removal, and automatic refresh behavior remain correct.
- [ ] Browser tests cover enqueue, navigation, reload, progress, success, failure, and retry.

## Phase 2: coalescing and resource controls

Priority: high after Phase 1.

- [ ] Coalesce source-version changes into one pending automatic refresh per workspace.
- [ ] Wait for related source imports to settle where possible; use a bounded delay so continuously changing inputs cannot postpone refresh forever.
- [ ] If data changes during a build, arrange a follow-up refresh without creating an unbounded queue or endlessly retrying a failed input signature.
- [ ] Define job priorities: initial imports and user-requested work ahead of automatic refresh, deletion, and old-generation cleanup, while preventing maintenance starvation.
- [ ] Keep one worker; do not add worker replicas as a shortcut.
- [ ] Make expensive publication stages bounded and resumable, with saved progress and cooperative yielding where feasible.
- [ ] Bound database reads/writes by response/request size as well as record count.
- [ ] Verify cleanup does not remove a graph that is still active or required by an in-progress publication.
- [ ] Benchmark API latency, database CPU, worker/database memory, and publication duration under representative contention.
- [ ] Agree on measurable responsiveness targets before declaring the performance goal complete.

### Phase 2 acceptance tests

- [ ] Multiple table syncs produce one coalesced refresh plus at most the necessary follow-up work.
- [ ] Continuous source changes do not prevent progress indefinitely.
- [ ] Imports in other workspaces progress during large, time-sliced publications.
- [ ] Real HelixDB scale testing includes the 100,000-record case and representative larger workloads; in-memory tests alone are insufficient.
- [ ] Compare interactive API latency against an idle baseline and the agreed thresholds.
- [ ] Verify bounded memory and response sizes during publication and subsequent cleanup.

## Phase 3: optional scheduled execution

Priority: later; requires product decisions before implementation.

- [ ] Keep **Apply in background now** as the default for explicit user changes.
- [ ] Offer an optional scheduled/off-hours mode for resource-intensive workspaces.
- [ ] Define timezone handling, daylight-saving behavior, missed-window handling, and restart recovery.
- [ ] Provide next-run visibility and **Run now** without creating a duplicate operation.
- [ ] Distinguish pending rule changes from active rules; do not display a scheduled definition as already applied.
- [ ] Document expected data freshness and schedule behavior.

### Decisions to resolve

- Is scheduling per workspace, per rule, or both?
- Should queued user changes publish the previewed snapshot or require review when source versions change?
- What should happen when several rule edits are queued before publication?
- What delay and maximum wait should automatic refresh coalescing use?
- What interactive latency and memory targets must supported installations meet?
- Which stages can be canceled, and what should users see after activation has begun?

## Non-goals and safeguards

- No implementation, container recreation, or data mutation as part of parking this backlog.
- No extra worker replicas.
- No promise of instantaneous per-record updates or zero resource contention.
- No silent changes to accepted relationship matching rules.
- No removal of validation, permission checks, or stale-input protection to make jobs appear successful.
- No heap-limit increases or volume deletion as substitutes for bounded execution.

## Completion checklist for future implementation

- [ ] Implement and validate Phase 1 before expanding scope.
- [ ] Update related API, workflow, and operations documentation.
- [ ] Run focused tests, typecheck, production build, and the repository's required regression checks.
- [ ] Obtain approval before disrupting running containers or changing scheduling behavior.
- [ ] Deploy through the appropriate development/operations workflow while preserving secrets and volumes.
- [ ] Verify exact health response, worker stability, durable operation recovery, and a real end-to-end relationship publication.
- [ ] Record benchmark results and any remaining limitations; update this backlog as phases are completed.
