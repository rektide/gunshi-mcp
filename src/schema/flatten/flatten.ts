import type { z } from "zod"
import type { FlattenedField, FlattenOptions } from "../types.ts"
import { introspectZodField, isZodObject, getZodObjectShape, unwrapZodWrappers } from "../introspect/field.ts"

export interface FlattenContext {
	fields: FlattenedField[]
	collisions: Map<string, string[]>
	maxDepth: number
	hasNested: boolean
}

export function flattenSchema<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
	options: FlattenOptions = {},
): FlattenedField[] {
	const { separator = "-", maxDepth = 3, prefix = "" } = options
	const context: FlattenContext = { fields: [], collisions: new Map(), maxDepth, hasNested: false }
	const firstPaths = new Map<string, string>()

	walk(schema.shape, prefix, 0, false, context, separator, maxDepth, firstPaths)

	return context.fields
}

export function flattenSchemaWithContext<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
	options: FlattenOptions = {},
): FlattenContext {
	const { separator = "-", maxDepth = 3, prefix = "" } = options
	const context: FlattenContext = { fields: [], collisions: new Map(), maxDepth, hasNested: false }
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
	if (maxDepth <= 0) {
		return
	}

	for (const [key, field] of Object.entries(shape)) {
		const flatKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key
		const unwrappedField = unwrapZodWrappers(field)
		const info = introspectZodField(field)
		const isOptional = parentOptional || !info.required
		const dotPath = currentPrefix ? `${currentPrefix}.${key}` : key

		if (info.type === "object" && isZodObject(unwrappedField)) {
			const innerShape = getZodObjectShape(unwrappedField)
			if (innerShape) {
				context.hasNested = true
				walk(innerShape, flatKey, depth + 1, isOptional, context, separator, maxDepth, firstPaths)
			}
		} else {
			if (context.fields.find((f) => f.key === flatKey)) {
				const existing = context.collisions.get(flatKey) ?? [firstPaths.get(flatKey) || dotPath]
				existing.push(dotPath)
				context.collisions.set(flatKey, existing)
			} else {
				firstPaths.set(flatKey, dotPath)
			}
			context.fields.push({ key: flatKey, info, depth, dotPath, optional: isOptional })
		}
	}
}
