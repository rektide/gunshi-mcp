import type { GunshiTool, ZodShape } from "../types.ts"
import type { OpenCodePluginOptions, OpenCodeToolContext } from "./types.ts"

export interface OpenCodeToolDefinition {
	description: string
	args: Record<string, unknown>
	execute: (args: Record<string, unknown>, context: OpenCodeToolContext) => Promise<unknown>
}

function shouldExposeTool(tool: GunshiTool, options: OpenCodePluginOptions): boolean {
	const { include, exclude } = options

	if (exclude && exclude.includes(tool.name)) {
		return false
	}

	if (include && include.length > 0) {
		return include.includes(tool.name)
	}

	return true
}

export function convertToOpenCodeTool<Shape extends ZodShape>(
	tool: GunshiTool<Shape>,
	extensions: Record<string, unknown>,
): OpenCodeToolDefinition {
	return {
		description: tool.description ?? "",
		args: tool.inputSchema.shape as Record<string, unknown>,
		execute: async (args: Record<string, unknown>, context: OpenCodeToolContext) => {
			const result = await tool.handler(args as any, {
				extensions,
				log: {
					info: console.log,
					warn: console.warn,
					error: console.error,
					debug: console.debug,
				},
				meta: {
					requestId: context.messageID,
				},
			})
			if (result.content && result.content.length > 0) {
				const first = result.content[0]
				if ("text" in first) {
					return first.text
				}
			}
			return result
		},
	}
}

export function filterTools(
	tools: readonly GunshiTool[],
	options: OpenCodePluginOptions,
): GunshiTool[] {
	return tools.filter((tool) => shouldExposeTool(tool, options))
}
