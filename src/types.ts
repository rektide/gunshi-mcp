export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}

export interface ToolResult {
	type: "tool_result"
	toolUseId: string
	content: Array<{
		type: "text"
		text: string
		annotations?: {
			audience?: "assistant" | "user"
			priority?: number
			lastModified?: string
		}
	}>
	isError?: boolean
	_meta?: Record<string, unknown>
	structuredContent?: unknown
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

/**
 * Helper to assert Gunshi command context values match expected tool schema type.
 * This is a type assertion that validates at compile time that values
 * structurally match the expected schema.
 *
 * Note: This uses a type assertion (`as TSchema`) because runtime values
 * from Gunshi are typed as `Record<string, unknown>` while tools expect
 * their specific schema type. The cast is safe because Gunshi's argument
 * parsing ensures values match the arg schema we provided.
 *
 * @internal
 */
export function assertToolInput<TSchema extends Record<string, unknown>>(
	values: Record<string, unknown>,
): TSchema {
	return values as TSchema
}
