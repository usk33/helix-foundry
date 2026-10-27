// Area schemas for Ontology: object types, link types, actions and object views.
// Owned by the ontology area. Import values only from "zod" (or other area modules):
// index.ts re-exports this file, so a value import from "./index.js" would be circular.
// Type-only imports from "./index.js" are fine.
import { z } from "zod";

export const OntologySchema = z.object({
  name: z.string().min(1),
  datasetId: z.string(),
  primaryKey: z.string(),
  properties: z.array(z.string()),
  description: z.string().default(""),
});
export const RelationshipSchema = z.object({
  name: z.string(),
  fromType: z.string(),
  toType: z.string(),
  fromColumn: z.string(),
  toColumn: z.string(),
  cardinality: z.enum(["many-to-one", "one-to-one"]).optional(),
  refresh: z.boolean().optional(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;
export const RelationshipChangeSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("upsert"),
    previousName: z.string().optional(),
    relationship: RelationshipSchema.extend({
      name: z.string().trim().min(1).max(120),
      cardinality: z.enum(["many-to-one", "one-to-one"]),
      refresh: z.boolean(),
    }),
  }),
  z.object({
    operation: z.literal("remove"),
    previousName: z.string().min(1),
  }),
]);
export type RelationshipChange = z.infer<typeof RelationshipChangeSchema>;
export type RelationshipPreview = {
  rows: {
    total: number;
    matched: number;
    pairs: number;
    empty: number;
    unmatched: number;
    ambiguous: number;
    duplicateSources: number;
  }[];
  cardinality: string;
  matches?: Record<string, unknown>[];
  unmatched?: Record<string, unknown>[];
};
export type RelationshipRules = {
  generation: string | null;
  relationships: Relationship[];
  previews: Record<string, RelationshipPreview>;
  types: {
    name: string;
    columns: { name: string; type: string; sample: unknown[] }[];
  }[];
  refreshJob?: { status: string; error?: string; updatedAt: string };
};
export type RelationshipDraft = {
  id: string;
  hash: string;
  valid: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  preview?: RelationshipPreview;
};
