import type { ToolDefinition, ZodShape } from "./types.js"

export function defineTool<TExtensions = {}>() {
	return <const Shape extends ZodShape>(
		definition: ToolDefinition<Shape, TExtensions>,
	): ToolDefinition<Shape, TExtensions> => definition
}
