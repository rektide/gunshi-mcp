import type { z } from "zod"
import { isZodObject } from "./introspect.js"

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

	const elementSchema = extractArrayElement(field)

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

function isZodArray(schema: unknown): schema is z.ZodArray<any> {
	return (
		typeof schema === "object" &&
		schema !== null &&
		"_def" in schema &&
		typeof (schema as any)._def === "object" &&
		"type" in (schema as any)._def &&
		(schema as any)._def.type === "ZodArray"
	)
}

function extractArrayElement(schema: z.ZodArray<any>): unknown {
	const def = (schema as { _def?: { element: unknown } })._def
	return def?.element
}
