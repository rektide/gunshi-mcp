import type { ToolDefinition } from "./types.js"

export function defineTool<TExtensions = {}>() {
	return <TSchema extends Record<string, unknown>>(
		definition: ToolDefinition<TSchema, TExtensions>,
	): ToolDefinition<TSchema, TExtensions> => definition
}
