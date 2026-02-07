import type { z } from "zod"
import type { SchemaAnalysis } from "./types.js"

const schemaCache = new WeakMap<z.ZodObject<any>, SchemaAnalysis>()

export function getCachedAnalysis<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
): SchemaAnalysis | undefined {
	return schemaCache.get(schema)
}

export function setCachedAnalysis<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
	analysis: SchemaAnalysis,
): void {
	schemaCache.set(schema, analysis)
}

export function clearCache(): void {
	;(schemaCache as WeakMap<object, unknown>).clear()
}

export function hasCache<T extends z.ZodRawShape>(schema: z.ZodObject<T>): boolean {
	return schemaCache.has(schema)
}
