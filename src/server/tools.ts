import type { GunshiTool } from "../types.ts"
import { buildToolContext } from "../context.ts"
import { formatResult } from "../output.ts"
import type { CallToolResult } from "@modelcontextprotocol/server"

export type ToolHandler = (args: unknown, extra: unknown) => Promise<CallToolResult>

export function createToolHandler(
	pluginExtensions: Record<string, unknown>,
): (tool: GunshiTool) => ToolHandler {
	return (tool) => async (args, extra) => {
		const toolCtx = buildToolContext(pluginExtensions, {
			requestId: (extra as any).requestId as string,
		})

		const parsed = tool.inputSchema.parse(args)
		const result = await tool.handler(parsed, toolCtx)

		return {
			content: [{ type: "text", text: formatResult(result) }],
		} as any
	}
}

export function registerGunshiTool(
	managedServer: {
		registerTool: (
			tool: {
				name: string
				title?: string
				description?: string
				inputSchema: unknown
				outputSchema?: unknown
				annotations?: unknown
			},
			handler: (args: unknown, extra: unknown) => Promise<CallToolResult>,
		) => void
	},
	tool: GunshiTool,
	handler: ToolHandler,
): void {
	managedServer.registerTool(
		{
			name: tool.name,
			title: tool.title,
			description: tool.description,
			inputSchema: tool.inputSchema as any,
			outputSchema: tool.outputSchema as any,
			annotations: tool.annotations as any,
		},
		handler,
	)
}
