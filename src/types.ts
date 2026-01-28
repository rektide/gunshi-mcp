import type { z } from "zod"

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export type ZodShape = z.ZodRawShape
export type ZodInput<Shape extends ZodShape> = z.infer<z.ZodObject<Shape>>

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
	Shape extends ZodShape = ZodShape,
	TExtensions = {},
> {
	name: string
	title?: string
	description: string
	input: z.ZodObject<Shape>
	output?: z.ZodTypeAny

	cli?: {
		args?: Partial<Record<keyof Shape, Partial<GunshiArg>>>
	}

	handler: (
		args: ZodInput<Shape>,
		ctx: ToolContext<TExtensions>,
	) => Promise<ToolResult>
}

export interface GunshiArg {
	type: "string" | "number" | "boolean" | "custom"
	description?: string
	short?: string
	required?: true
	default?: string | number | boolean | undefined
	parse?: (value: string) => unknown
}

export type AnyToolDefinition = ToolDefinition<any, any>

export interface McpToolExtra {
	requestId?: string
}

export interface JsonSchema {
	type: string
	properties?: Record<string, object>
	required?: string[]
	additionalProperties?: boolean
}
