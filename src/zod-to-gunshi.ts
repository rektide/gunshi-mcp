import type { GunshiArg, ZodShape } from "./types.js"
import type { z } from "zod"

interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

function introspectZodField(schema: unknown): ZodFieldInfo {
	let inner = schema
	let required = true
	let defaultValue: unknown
	let description = undefined as string | undefined
	let depth = 0
	const maxDepth = 10

	// Extract description from outer schema if present
	if (typeof inner === "object" && inner !== null && "description" in inner) {
		description = inner.description as string | undefined
	}

	// Walk through Zod wrappers (ZodOptional, ZodDefault, etc.)
	while (depth < maxDepth) {
		// Check for type property directly on schema
		const schemaType = (inner as { type?: string }).type

		if (schemaType === "optional") {
			required = false
			// Use unwrap() method if available (Zod 3+)
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else if (schemaType === "default") {
			const def = (inner as { _def?: { defaultValue: unknown } })._def
			if (def && "defaultValue" in def) {
				if (typeof def.defaultValue === "function") {
					try {
						defaultValue = (def.defaultValue as () => unknown)()
					} catch {
						// Default value function might fail, that's ok
					}
				} else {
					defaultValue = def.defaultValue
				}
			}
			// Default values make fields optional
			required = false
			// Use unwrap() method if available
			if (typeof (inner as { unwrap?: () => unknown }).unwrap === "function") {
				inner = (inner as { unwrap: () => unknown }).unwrap()
			}
			depth++
			continue
		} else {
			// Found actual schema type
			break
		}
	}

	// Extract description from inner schema if not found on outer
	if (
		!description &&
		typeof inner === "object" &&
		inner !== null &&
		"description" in inner
	) {
		description = inner.description as string | undefined
	}

	// Determine the base type
	let typeName: string | undefined
	if (typeof inner === "object" && inner !== null && "type" in inner) {
		typeName = (inner as { type?: string }).type
	}

	// Map Zod types to Gunshi arg types
	switch (typeName) {
		case "string":
			return { type: "string", required, default: defaultValue, description }
		case "number":
			return { type: "number", required, default: defaultValue, description }
		case "boolean":
			return { type: "boolean", required, default: defaultValue, description }
		case "enum": {
			const values =
				typeof inner === "object" &&
				inner !== null &&
				"enum" in inner &&
				typeof inner.enum === "object"
					? Object.values(inner.enum as Record<string, string>)
					: undefined
			return {
				type: "enum",
				required,
				default: defaultValue,
				description,
				enumValues: values,
			}
		}
		case "array":
			return { type: "array", required, default: defaultValue, description }
		case "object":
			return { type: "object", required, default: defaultValue, description }
		default:
			return { type: "string", required, default: defaultValue, description }
	}
}

/**
 * Convert Zod schema to Gunshi argument definitions.
 * This function handles type-safe conversion from Zod schemas to Gunshi's arg format.
 *
 * @param schema - The Zod schema object
 * @param overrides - Optional override for specific arguments (CLI configuration)
 * @returns Gunshi argument definitions
 */
export function zodSchemaToGunshiArgs<const Shape extends ZodShape>(
	schema: z.ZodObject<Shape>,
	overrides?: Partial<Record<keyof Shape, Partial<GunshiArg>>>,
): Record<keyof Shape, GunshiArg> {
	const args: Record<keyof Shape, GunshiArg> = {} as Record<keyof Shape, GunshiArg>

	for (const name in schema.shape) {
		const field = schema.shape[name]
		const info = introspectZodField(field)
		const override = overrides?.[name] ?? {}

		const arg: GunshiArg = {
			type:
				override.type ??
				(info.type === "enum"
					? "string"
					: info.type === "array"
						? "custom"
						: info.type === "object"
							? "custom"
							: info.type),
			description: override.description ?? info.description,
			short: override.short,
			required: (override.required ?? info.required) ? true : undefined,
			default:
				override.default ??
				(typeof info.default === "string" ||
				typeof info.default === "number" ||
				typeof info.default === "boolean"
					? info.default
					: undefined),
		}

		if (info.type === "array" && !override.parse) {
			arg.parse = (v: string) => v.split(",").map((s) => s.trim())
		} else if (info.type === "object" && !override.parse) {
			arg.parse = (v: string) => JSON.parse(v)
		}

		if (override.parse) {
			arg.parse = override.parse
		}

		args[name] = arg
	}

	return args
}

/**
 * Convert Zod schema to JSON Schema for MCP tool registration.
 * This handles subset of Zod types supported by gunshi-mcp.
 *
 * @param schema - The Zod schema object
 * @returns JSON Schema object compatible with MCP protocol
 */
export function zodToJsonSchema<const Shape extends ZodShape>(
	schema: z.ZodObject<Shape>,
): object {
	const properties: Record<string, object> = {}
	const required: string[] = []

	for (const name in schema.shape) {
		const field = schema.shape[name]
		const info = introspectZodField(field)

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
			...(info.type === "array" && { items: { type: "string" } }),
			...(info.enumValues && { enum: info.enumValues }),
		}

		properties[name] = property

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
