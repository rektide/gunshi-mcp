import type { ToolResult } from "./types.ts"

export function extractText(result: ToolResult): string {
	return result.content
		.filter((c) => c.type === "text")
		.map((c) => c.text)
		.join("\n")
}

export function formatResult(result: ToolResult, format?: "text" | "json"): string {
	if (format === "json" && result.structuredContent) {
		return JSON.stringify(result.structuredContent, null, 2)
	}
	return extractText(result)
}
