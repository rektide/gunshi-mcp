import { isZodObject, isZodArray, getZodArrayElement } from "./introspect.ts"

export interface ArrayHandlerInfo {
	shouldUseRepeated: boolean
	parse: (value: string) => unknown
}

export function analyzeArray(
	field: unknown,
	arrayHandling: "json" | "repeated" = "repeated",
): ArrayHandlerInfo {
	if (!isZodArray(field)) {
		return { shouldUseRepeated: false, parse: (v: string) => v.split(",").map((s) => s.trim()) }
	}

	const elementSchema = getZodArrayElement(field)

	if (isZodObject(elementSchema)) {
		if (arrayHandling === "repeated") {
			return {
				shouldUseRepeated: true,
				parse: (v: string) => JSON.parse(v),
			}
		}
	}

	return {
		shouldUseRepeated: false,
		parse: (v: string) => v.split(",").map((s) => s.trim()),
	}
}
