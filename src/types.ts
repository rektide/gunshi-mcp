export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}

export interface ToolResult {
	content: Array<{ type: string; text: string }>
	structuredContent?: unknown
	isError?: boolean
}

export interface ToolContext<E = {}> {
	extensions: E
	log: Record<string, (msg: string, ...args: unknown[]) => void>
	meta: { requestId?: string }
}

export interface ToolDefinition<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
	TExtensions = {},
> {
	name: string
	title?: string
	description: string
	inputSchema: TSchema
	outputSchema?: Record<string, unknown>

	cli?: {
		args?: Partial<Record<keyof TSchema, Partial<GunshiArg>>>
	}

	handler: (args: TSchema, ctx: ToolContext<TExtensions>) => Promise<ToolResult>
}

export interface GunshiArg {
	type: "string" | "number" | "boolean" | "custom"
	description?: string
	short?: string
	required?: true
	default?: string | number | boolean | undefined
	parse?: (value: string) => unknown
}

export interface McpNewPluginOptions {
	tools?: ToolDefinition[]
	name?: string
	version?: string
}

export interface McpToolExtra {
	requestId?: string
}
