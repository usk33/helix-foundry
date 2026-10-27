import type { Relationship } from "../../../packages/shared/src/index.js";

// Keep validation, publication, graph exploration and link counts identical.
export function relationshipJoin(rel: Relationship) {
  const q = (v: string) => '"' + v.replaceAll('"', '""') + '"';
  const equality = `a.${q(rel.fromColumn)}=b.${q(rel.toColumn)}`;
  return rel.cardinality
    ? `${equality} AND CAST(a.${q(rel.fromColumn)} AS VARCHAR) <> '' AND CAST(b.${q(rel.toColumn)} AS VARCHAR) <> ''`
    : equality;
}
