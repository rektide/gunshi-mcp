import type { GunshiTool } from "../types.ts"
import { buildToolContext } from "../context.ts"
import { formatResult } from "../output.ts"
import type {
	AnySchema,
	ToolAnnotations,
	ToolCallback,
} from "@modelcontextprotocol/server"

export type ToolHandler = (
	args: unknown,
	extra: {
		requestId: string | number
	},
) => Promise<{ content: Array<{ type: string; text: string }> }>

export function createToolHandler(
	pluginExtensions: Record<string, unknown>,
): (tool: GunshiTool) => ToolHandler {
	return (tool) => async (args, extra) => {
		const toolCtx = buildToolContext(pluginExtensions, {
			requestId: String(extra.requestId),
		})

		const parsed = tool.inputSchema.parse(args)
		const result = await tool.handler(parsed, toolCtx)

		return {
			content: [{ type: "text", text: formatResult(result) }],
		}
	}
}

export function registerGunshiTool(
	managedServer: {
		registerTool: <OutputArgs extends AnySchema, InputArgs extends AnySchema>(
			name: string,
			config: {
				title?: string
				description?: string
				inputSchema?: InputArgs
				outputSchema?: OutputArgs
				annotations?: ToolAnnotations
			},
			handler: ToolCallback<InputArgs>,
		) => void
	},
	tool: GunshiTool,
	handler: ToolHandler,
): void {
	managedServer.registerTool(
		tool.name,
		{
			title: tool.title,
			description: tool.description,
			inputSchema: tool.inputSchema as AnySchema,
			outputSchema: tool.outputSchema as AnySchema,
			annotations: tool.annotations as ToolAnnotations,
		},
		handler as ToolCallback<AnySchema>,
	)
}
