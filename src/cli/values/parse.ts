export interface ParseContext {
	arrayHandling?: "json" | "repeated"
	separator?: string
}

export function parseValue(value: string, type: string, context: ParseContext): unknown {
	switch (type) {
		case "number":
			return Number.parseFloat(value)
		case "boolean":
			return value === "true" || value === "1"
		case "array":
			if (context.arrayHandling === "json") {
				return JSON.parse(value)
			}
			return value.split(",").map((s) => s.trim())
		case "object":
			return JSON.parse(value)
		default:
			return value
	}
}
