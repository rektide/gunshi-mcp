export interface ArrayHandlerInfo {
	shouldUseRepeated: boolean
	parse: (value: string) => unknown
}

export interface ArrayHandlerContext {
	arrayHandling?: "json" | "repeated"
}

export function analyzeArray(
	fieldType: string,
	elementIsObject: boolean,
	context: ArrayHandlerContext,
): ArrayHandlerInfo {
	if (fieldType !== "array") {
		return { shouldUseRepeated: false, parse: (v: string) => v.split(",").map((s) => s.trim()) }
	}

	if (context.arrayHandling === "json") {
		return {
			shouldUseRepeated: false,
			parse: (v: string) => JSON.parse(v),
		}
	}

	if (elementIsObject && context.arrayHandling === "repeated") {
		return {
			shouldUseRepeated: true,
			parse: (v: string) => JSON.parse(v),
		}
	}

	return {
		shouldUseRepeated: false,
		parse: (v: string) => v.split(",").map((s) => s.trim()),
	}
}
