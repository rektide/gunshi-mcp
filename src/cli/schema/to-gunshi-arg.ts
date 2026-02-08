import type { GunshiArg } from "../../types.ts"
import type { ArgSchema } from "gunshi"

export interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

export interface BuildGunshiArgOptions {
	info: ZodFieldInfo
	override?: Partial<GunshiArg>
	parseFunction?: (value: string) => unknown
	isOptional?: boolean
}

export function buildGunshiArg(options: BuildGunshiArgOptions): GunshiArg {
	const { info, override, parseFunction, isOptional } = options
	const required = override?.required ?? (isOptional !== undefined ? !isOptional : info.required)

	const arg: ArgSchema = {
		type:
			override?.type ??
			(info.type === "enum"
				? "string"
				: info.type === "array" || info.type === "object"
					? "custom"
					: info.type),
		description: override?.description ?? info.description,
		short: override?.short,
		required: required ? true : undefined,
		default:
			override?.default ??
			(typeof info.default === "string" || typeof info.default === "number" || typeof info.default === "boolean"
				? info.default
				: undefined),
	}

	if (parseFunction) {
		arg.parse = parseFunction
	} else if (override?.parse) {
		arg.parse = override.parse
	}

	return arg
}
