import type { z } from "zod"
import type { FlattenOptions, ZodFieldInfo } from "./types.js"
import {
	introspectZodField,
	isZodObject,
	getZodObjectShape,
	unwrapZodWrappers,
} from "./introspect.js"

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
	const firstPaths = new Map<string, string>()

	walk(schema.shape, prefix, 0, false, context, separator, maxDepth, firstPaths)

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
	firstPaths: Map<string, string>,
) {
	for (const [key, field] of Object.entries(shape)) {
		const flatKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key
		const unwrappedField = unwrapZodWrappers(field)
		const info = introspectZodField(field)
		const isOptional = parentOptional || !info.required
		const dotPath = currentPrefix ? `${currentPrefix}.${key}` : key

		if (info.type === "object" && isZodObject(unwrappedField)) {
			const innerShape = getZodObjectShape(unwrappedField)
			if (innerShape) {
				if (depth >= maxDepth) {
					context.args[flatKey] = { info, depth: depth + 1, optional: isOptional }
				} else {
					walk(innerShape, flatKey, depth + 1, isOptional, context, separator, maxDepth, firstPaths)
				}
			}
		} else {
			if (context.args[flatKey]) {
				const existing = context.collisions.get(flatKey) ?? [firstPaths.get(flatKey) || dotPath]
				existing.push(dotPath)
				context.collisions.set(flatKey, existing)
			} else {
				firstPaths.set(flatKey, dotPath)
			}
			context.args[flatKey] = { info, depth, optional: isOptional }
		}
	}
}
