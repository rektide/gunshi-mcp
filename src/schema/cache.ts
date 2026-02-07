import type { z } from "zod"
import type { SchemaAnalysis } from "./types.ts"

export const schemaCache = new WeakMap<z.ZodObject<any>, SchemaAnalysis>()
