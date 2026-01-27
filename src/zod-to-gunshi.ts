import type { GunshiArg } from "./types.js"

interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

function introspectZodField(schema: unknown): ZodFieldInfo {
	const s = schema as {
		_def?: { typeName?: string }
		description?: string
	}

	let inner = schema
	let required = true
	let defaultValue: unknown
	let description = s.description

	const def = (inner as { _def?: Record<string, unknown> })._def

	if (def?.typeName === "ZodOptional") {
		required = false
		inner = (inner as { _def: { innerType?: unknown } })._def.innerType
	}

	if (def?.typeName === "ZodDefault") {
		defaultValue = (def.defaultValue as () => unknown)()
		inner = (inner as { _def: { innerType?: unknown } })._def.innerType
	}

	const innerDef = (inner as { _def?: { typeName?: string; values?: unknown[] } })._def
	description = description ?? (inner as { description?: string }).description

	const typeName = innerDef?.typeName
	switch (typeName) {
		case "ZodString":
			return { type: "string", required, default: defaultValue, description }
		case "ZodNumber":
			return { type: "number", required, default: defaultValue, description }
		case "ZodBoolean":
			return { type: "boolean", required, default: defaultValue, description }
		case "ZodEnum":
			return {
				type: "enum",
				required,
				default: defaultValue,
				description,
				enumValues: innerDef?.values as string[],
			}
		case "ZodArray":
			return { type: "array", required, default: defaultValue, description }
		case "ZodObject":
			return { type: "object", required, default: defaultValue, description }
		default:
			return { type: "string", required, default: defaultValue, description }
	}
}

export function zodSchemaToGunshiArgs(
	schema: Record<string, unknown>,
	overrides?: Record<string, Partial<GunshiArg>>,
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
			required: override.required ?? info.required,
			default: override.default ?? info.default,
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
