import type { GunshiArg, ZodShape } from "../types.js"
import type { z } from "zod"
import type { CliOptions } from "./types.js"
import { flattenSchema } from "./flatten.js"
import { checkCollisions } from "./collision.js"
import { analyzeArray } from "./arrays.js"
import { buildGunshiArg } from "./overrides.js"
import { isZodObject, getZodObjectShape, unwrapZodWrappers } from "./introspect.js"

export type { CliOptions } from "./types.js"

/**
 * Convert a Zod schema to Gunshi CLI argument definitions.
 *
 * @param schema - The Zod object schema
 * @param overrides - Optional per-field overrides (keyed by flat flag name, e.g., "config-timeout")
 * @param options - CLI generation options (separator, maxDepth, arrayHandling)
 */
export function zodSchemaToGunshiArgs<const Shape extends ZodShape>(
	schema: z.ZodObject<Shape>,
	overrides?: Partial<Record<string, Partial<GunshiArg>>>,
	options?: CliOptions,
): Record<string, GunshiArg> {
	const { arrayHandling = "repeated", separator, maxDepth } = options || {}
	const flattenOptions = { separator, maxDepth }
	const context = flattenSchema(schema, flattenOptions)
	checkCollisions(context)

	const args: Record<string, GunshiArg> = {}

	for (const [flatKey, { info, optional }] of Object.entries(context.args)) {
		const override = overrides?.[flatKey]
		const field = lookupField(schema, flatKey, flattenOptions.separator || "-")

		let parseFunction: ((value: string) => unknown) | undefined

		if (info.type === "array" && field) {
			const arrayHandler = analyzeArray(field, arrayHandling)
			if (!override?.parse) {
				parseFunction = arrayHandler.parse
			}
		} else if (info.type === "object" && !override?.parse) {
			parseFunction = (v: string) => JSON.parse(v)
		}

		args[flatKey] = buildGunshiArg(info, override, parseFunction, optional)
	}

	return args
}

function lookupField(schema: z.ZodObject<any>, flatKey: string, separator: string): unknown {
	const parts = flatKey.split(separator)
	let shape = schema.shape

	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i]
		const field = shape[part]
		const unwrappedField = unwrapZodWrappers(field)
		if (!isZodObject(unwrappedField)) {
			return undefined
		}
		shape = getZodObjectShape(unwrappedField)
	}

	return shape[parts[parts.length - 1]]
}
