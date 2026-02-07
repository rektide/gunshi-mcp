import type { GunshiArg } from "../types.ts"
import type { ZodFieldInfo } from "./types.ts"

/**
 * Build a GunshiArg from introspected field info and optional overrides.
 * @param info - Introspected Zod field info
 * @param override - User-provided overrides
 * @param parseFunction - Custom parse function for arrays/objects
 * @param isOptional - Whether field is optional (including inherited from parent)
 */
export function buildGunshiArg(
	info: ZodFieldInfo,
	override: Partial<GunshiArg> = {},
	parseFunction?: (value: string) => unknown,
	isOptional?: boolean,
): GunshiArg {
	const required = override.required ?? (isOptional !== undefined ? !isOptional : info.required)

	const arg: GunshiArg = {
		type:
			override.type ??
			(info.type === "enum"
				? "string"
				: info.type === "array" || info.type === "object"
					? "custom"
					: info.type),
		description: override.description ?? info.description,
		short: override.short,
		required: required ? true : undefined,
		default:
			override.default ??
			(typeof info.default === "string" ||
			typeof info.default === "number" ||
			typeof info.default === "boolean"
				? info.default
				: undefined),
	}

	if (parseFunction) {
		arg.parse = parseFunction
	} else if (override.parse) {
		arg.parse = override.parse
	}

	return arg
}
