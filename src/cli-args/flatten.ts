import type { z } from "zod"
import type { FlattenOptions, ZodFieldInfo } from "./types.js"
import { introspectZodField, isZodObject, getZodObjectShape } from "./introspect.js"

export interface FlattenedArg {
	info: ZodFieldInfo
	depth: number
	/** Whether this field is optional (including inherited from optional parent) */
	optional: boolean
}

export interface FlattenContext {
	args: Record<string, FlattenedArg>
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
		const path = currentPrefix ? `${currentPrefix}${separator}${key}` : key

		if (info.type === "object" && isZodObject(field)) {
			if (depth >= maxDepth) {
				context.args[flatKey] = { info, depth: depth + 1, optional: isOptional }
			} else {
				const innerShape = getZodObjectShape(field)
				walk(innerShape, flatKey, depth + 1, isOptional, context, separator, maxDepth)
			}
		} else {
			if (context.args[flatKey]) {
				const existing = context.collisions.get(flatKey) || [path]
				existing.push(path)
				context.collisions.set(flatKey, existing)
			}
			context.args[flatKey] = { info, depth, optional: isOptional }
		}
	}
}
