import type { GunshiArg } from "../../types.ts"

export interface OverrideContext {
	cli?: Partial<Record<string, Partial<GunshiArg>>>
}

export function applyOverrides<T extends Record<string, unknown>>(
	args: T,
	overrides?: Partial<Record<string, Partial<GunshiArg>>>,
): T {
	if (!overrides) {
		return args
	}

	const result = { ...args }

	for (const [key, override] of Object.entries(overrides)) {
		if (result[key as keyof T] && override) {
			result[key as keyof T] = {
				...(result[key as keyof T] as object),
				...override,
			} as T[keyof T]
		}
	}

	return result
}
