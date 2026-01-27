import type { GunshiArg } from "./types.js"

interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

/**
 * Type guard to check if an object has a _def property (Zod schema)
 */
function hasZodDef(obj: unknown): obj is { _def: Record<string, unknown> } {
	return typeof obj === "object" && obj !== null && "_def" in obj
}

function introspectZodField(schema: unknown): ZodFieldInfo {
	let inner = schema
	let required = true
	let defaultValue: unknown
	let description = undefined as string | undefined

	// Extract description from outer schema if present
	if (typeof inner === "object" && inner !== null && "description" in inner) {
		description = inner.description as string | undefined
	}

	// Walk through Zod wrappers (ZodOptional, ZodDefault, etc.)
	while (hasZodDef(inner)) {
		const def = inner._def

		if (def.typeName === "ZodOptional") {
			required = false
			if (
				hasZodDef(def) &&
				"innerType" in def &&
				typeof def.innerType === "object" &&
				def.innerType !== null
			) {
				inner = def.innerType
			}
		} else if (def.typeName === "ZodDefault") {
			if ("defaultValue" in def && typeof def.defaultValue === "function") {
				try {
					defaultValue = (def.defaultValue as () => unknown)()
				} catch {
					// Default value function might fail, that's ok
				}
			}
			if (
				hasZodDef(def) &&
				"innerType" in def &&
				typeof def.innerType === "object" &&
				def.innerType !== null
			) {
				inner = def.innerType
			}
		} else {
			// Found the actual schema type
			break
		}
	}

	// Extract description from inner schema if not found on outer
	if (
		!description &&
		hasZodDef(inner) &&
		"description" in inner &&
		typeof inner.description === "string"
	) {
		description = inner.description
	}

	// Determine the base type
	const typeName =
		hasZodDef(inner) && typeof inner._def.typeName === "string" ? inner._def.typeName : undefined

	switch (typeName) {
		case "ZodString":
			return { type: "string", required, default: defaultValue, description }
		case "ZodNumber":
			return { type: "number", required, default: defaultValue, description }
		case "ZodBoolean":
			return { type: "boolean", required, default: defaultValue, description }
		case "ZodEnum": {
			const values =
				hasZodDef(inner) && "values" in inner._def && Array.isArray(inner._def.values)
					? (inner._def.values as string[])
					: undefined
			return {
				type: "enum",
				required,
				default: defaultValue,
				description,
				enumValues: values,
			}
		}
		case "ZodArray":
			return { type: "array", required, default: defaultValue, description }
		case "ZodObject":
			return { type: "object", required, default: defaultValue, description }
		default:
			return { type: "string", required, default: defaultValue, description }
	}
}

/**
 * Convert Zod schema to Gunshi argument definitions.
 * This function handles type-safe conversion from Zod schemas to Gunshi's arg format.
 *
 * @param schema - The Zod schema as a record of fields
 * @param overrides - Optional override for specific arguments (CLI configuration)
 * @returns Gunshi argument definitions
 */
export function zodSchemaToGunshiArgs(
	schema: Record<string, unknown>,
	overrides?: Partial<Record<string, Partial<GunshiArg>>>,
): Record<string, GunshiArg> {
	const args: Record<string, GunshiArg> = {}

	for (const [name, field] of Object.entries(schema)) {
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
