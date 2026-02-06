import type { GunshiArg, ZodShape, CliOptions } from "./types.js"
import type { z } from "zod"
import { introspectZodField, isZodObject, getZodArrayElement } from "./cli-args/introspect.js"
import { reconstructNested } from "./cli-args/reconstruct.js"
import { zodSchemaToGunshiArgs as newImpl } from "./cli-args/converter.js"

export { reconstructNested as reconstructNestedValues }
export type { CliOptions, GunshiArg } from "./types.js"

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
	return newImpl(schema, overrides, options)
}

export function zodToJsonSchema<const Shape extends ZodShape>(schema: z.ZodObject<Shape>): object {
	const properties: Record<string, object> = {}
	const required: string[] = []

	for (const name in schema.shape) {
		const field = schema.shape[name]
		const info = introspectZodField(field)

		if (info.type === "object" && isZodObject(field)) {
			const nestedSchema = zodToJsonSchema(field as z.ZodObject<any>)
			properties[name] = {
				...nestedSchema,
				...(info.description && { description: info.description }),
				...(info.default !== undefined && { default: info.default }),
			}
		} else {
			let jsonType: string
			switch (info.type) {
				case "string":
					jsonType = "string"
					break
				case "number":
					jsonType = "number"
					break
				case "boolean":
					jsonType = "boolean"
					break
				case "enum":
					jsonType = "string"
					break
				case "array":
					jsonType = "array"
					break
				case "object":
					jsonType = "object"
					break
				default:
					jsonType = "string"
			}

			const property: Record<string, unknown> = {
				type: jsonType,
				...(info.description && { description: info.description }),
				...(info.default !== undefined && { default: info.default }),
				...(info.enumValues && { enum: info.enumValues }),
				...(info.type === "array" && {
					items: introspectArrayElement(field),
				}),
			}

			properties[name] = property
		}

		if (info.required) {
			required.push(name)
		}
	}

	return {
		type: "object",
		properties,
		...(required.length > 0 && { required }),
		additionalProperties: false,
	}
}

function introspectArrayElement(field: unknown): { type: string } {
	const element = getZodArrayElement(field)
	if (!element) {
		return { type: "string" }
	}
	const info = introspectZodField(element)
	switch (info.type) {
		case "string":
			return { type: "string" }
		case "number":
			return { type: "number" }
		case "boolean":
			return { type: "boolean" }
		case "object":
			return { type: "object" }
		default:
			return { type: "string" }
	}
}
