import type { z } from "zod"
import type { FlattenOptions } from "./types.js"
import { introspectZodField, isZodObject } from "./introspect.js"

export interface FlattenContext {
	args: Record<string, { info: ReturnType<typeof introspectZodField>; depth: number }>
	collisions: Map<string, string[]>
}

export function flattenSchema(
	schema: z.ZodObject<any>,
	options: FlattenOptions = {},
): FlattenContext {
	const { separator = "-", maxDepth = 3, prefix = "" } = options
	const context: FlattenContext = { args: {}, collisions: new Map() }

	walk(schema.shape, prefix, 0, false, context, separator, maxDepth)

	return context
}

function walk(
	shape: z.ZodRawShape,
	currentPrefix: string,
	depth: number,
	parentOptional: boolean,
	context: FlattenContext,
	separator: string,
	maxDepth: number,
) {
	for (const [key, field] of Object.entries(shape)) {
		const flatKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key
		const info = introspectZodField(field)
		const isOptional = parentOptional || !info.required

		if (info.type === "object" && isZodObject(field)) {
			if (depth >= maxDepth) {
				context.args[flatKey] = { info, depth: depth + 1 }
			} else {
				const innerSchema = (field as { _def?: { shape: z.ZodRawShape } })._def?.shape
				if (innerSchema && typeof innerSchema === "object") {
					walk(innerSchema, flatKey, depth + 1, isOptional, context, separator, maxDepth)
				}
			}
		} else {
			if (context.args[flatKey]) {
				const existing = context.collisions.get(flatKey) || [flatKey]
				existing.push(`${currentPrefix}.${key}`)
				context.collisions.set(flatKey, existing)
			}
			context.args[flatKey] = { info, depth }
		}
	}
}
