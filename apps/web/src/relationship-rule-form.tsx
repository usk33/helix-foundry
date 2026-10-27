import { useState } from "react";
import type {
  Relationship,
  RelationshipChange,
  RelationshipDraft,
  RelationshipRules,
} from "../../../packages/shared/src";
import { api, number } from "./api";
import { DataTable, useAction, useWorkspace } from "./ui";

export default function RelationshipRuleForm({
  rules,
  initial,
  onDone,
}: {
  rules: RelationshipRules;
  initial?: Relationship;
  onDone: () => void;
}) {
  const { id } = useWorkspace();
  const action = useAction();
  const [name, setName] = useState(initial?.name || ""),
    [fromType, setFromType] = useState(
      initial?.fromType || rules.types[0]?.name || "",
    ),
    [toType, setToType] = useState(
      initial?.toType || rules.types[1]?.name || rules.types[0]?.name || "",
    ),
    [fromColumn, setFromColumn] = useState(initial?.fromColumn || ""),
    [toColumn, setToColumn] = useState(initial?.toColumn || ""),
    [cardinality, setCardinality] = useState<"many-to-one" | "one-to-one">(
      initial?.cardinality || "many-to-one",
    ),
    [refresh, setRefresh] = useState(initial?.refresh ?? true),
    [removing, setRemoving] = useState(false),
    [draft, setDraft] = useState<RelationshipDraft>();
  const change: RelationshipChange =
    removing && initial
      ? { operation: "remove", previousName: initial.name }
      : {
          operation: "upsert",
          previousName: initial?.name,
          relationship: {
            name,
            fromType,
            toType,
            fromColumn,
            toColumn,
            cardinality,
            refresh,
          },
        };
  const counts = draft?.preview?.rows[0];
  return (
    <div className="pad on-relationship-form">
      <p className="muted">
        Define a rule once to link all matching records. No new entity types or
        missing target records are created.
      </p>
      <fieldset
        className="plain-fieldset"
        disabled={action.pending}
        onChange={() => setDraft(undefined)}
      >
        <label>
          Relationship name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="form-grid">
          {(
            [
              ["From", fromType, setFromType, fromColumn, setFromColumn],
              ["To", toType, setToType, toColumn, setToColumn],
            ] as const
          ).map(([label, type, setType, column, setColumn]) => {
            const columns =
              rules.types.find((t) => t.name === type)?.columns || [];
            const selected = columns.find((c) => c.name === column);
            return (
              <div key={label}>
                <label>
                  {label} entity
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setColumn("");
                    }}
                  >
                    {rules.types.map((t) => (
                      <option key={t.name}>{t.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {label} matching field
                  <select
                    value={column}
                    onChange={(e) => setColumn(e.target.value)}
                  >
                    <option value="">Select a field</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <p className="muted">
                    Sample:{" "}
                    {selected.sample
                      .map((v) => (v == null ? "null" : String(v)))
                      .join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <label>
          Expected relationship
          <select
            value={cardinality}
            onChange={(e) => {
              if (
                e.target.value === "many-to-one" ||
                e.target.value === "one-to-one"
              )
                setCardinality(e.target.value);
            }}
          >
            <option value="many-to-one">
              Many source records to one target record
            </option>
            <option value="one-to-one">
              One source record to one target record
            </option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={refresh}
            onChange={(e) => setRefresh(e.target.checked)}
          />
          Keep relationships updated when source data changes
        </label>
      </fieldset>
      <p className="muted">
        Fields are compared using database equality, without fuzzy matching or
        automatic trimming. Null and empty values do not match. Manual links and
        removals remain separate overrides, including after this rule is removed
        or renamed.
      </p>
      {draft && (
        <section aria-label="Relationship preview" aria-live="polite">
          <h3>
            {removing ? "Review rule removal" : "Review matching records"}
          </h3>
          {removing && (
            <p>
              Remove the rule and its generated links. Records and other
              definitions are kept. Manual overrides remain.
            </p>
          )}
          {counts && (
            <ul>
              <li>{number(Number(counts.total))} source records checked</li>
              <li>{number(Number(counts.matched))} source records matched</li>
              <li>
                {number(Number(counts.pairs))} generated relationship pairs
                before manual overrides
              </li>
              <li>{number(Number(counts.empty))} empty matching fields</li>
              <li>
                {number(Number(counts.unmatched))} non-empty fields without a
                match
              </li>
              <li>
                {number(Number(counts.ambiguous))} source records with multiple
                target matches
              </li>
              <li>
                {number(Number(counts.duplicateSources))} matching values shared
                by multiple source records
              </li>
            </ul>
          )}
          {draft.preview?.matches && (
            <details>
              <summary>Sample matching links</summary>
              <DataTable rows={draft.preview.matches} />
            </details>
          )}
          {draft.preview?.unmatched && (
            <details>
              <summary>Sample unmatched records (including nulls)</summary>
              <DataTable rows={draft.preview.unmatched} />
            </details>
          )}
          {!draft.valid && (
            <div className="notice" role="alert">
              <div>
                <strong>Publication blocked</strong>
                <ul>
                  {draft.checks
                    .filter((c) => !c.passed)
                    .map((c) => (
                      <li key={c.name}>
                        {c.name}: {c.detail}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
          {draft.valid && (
            <p>
              All definitions passed validation. Publication rebuilds the
              workspace graph and makes it visible only when complete. Unmatched
              records remain unlinked.
            </p>
          )}
        </section>
      )}
      <div className="modal-actions">
        {initial && !removing && (
          <button
            className="button"
            disabled={action.pending}
            onClick={() => {
              setRemoving(true);
              setDraft(undefined);
            }}
          >
            Remove rule
          </button>
        )}
        {removing && (
          <button
            className="button"
            disabled={action.pending}
            onClick={() => {
              setRemoving(false);
              setDraft(undefined);
            }}
          >
            Keep rule
          </button>
        )}
        <button
          className="button"
          disabled={
            action.pending ||
            (!removing && (!name.trim() || !fromColumn || !toColumn))
          }
          onClick={() =>
            action.run(async () => {
              setDraft(undefined);
              setDraft(
                await api<RelationshipDraft>(
                  `/workspaces/${id}/ontology/relationships/preview`,
                  change,
                ),
              );
            })
          }
        >
          {action.pending
            ? "Working..."
            : removing
              ? "Preview removal"
              : "Preview relationship"}
        </button>
        {draft?.valid && (
          <button
            className="button primary"
            disabled={action.pending}
            onClick={() =>
              action.run(
                async () => {
                  await api(`/workspaces/${id}/proposals/${draft.id}/publish`, {
                    hash: draft.hash,
                  });
                  onDone();
                },
                removing
                  ? "Relationship rule removed"
                  : "Relationship rule published",
              )
            }
          >
            {action.pending
              ? "Publishing..."
              : removing
                ? "Publish removal"
                : "Publish relationship"}
          </button>
        )}
      </div>
    </div>
  );
}
