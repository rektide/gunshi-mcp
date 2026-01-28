import type { z } from "zod"
import type { CliOptions } from "./cli-args/types.js"
import type { ArgSchema } from "gunshi"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

export type { CliOptions } from "./cli-args/types.js"
export type GunshiArg = ArgSchema
export type ToolResult = CallToolResult

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export type ZodShape = z.ZodRawShape
export type ZodInput<Shape extends ZodShape> = z.infer<z.ZodObject<Shape>>

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}

export interface ToolContext<E = {}> {
	extensions: E
	log: Record<string, (msg: string, ...args: unknown[]) => void>
	meta: { requestId?: string }
}

export interface ToolDefinition<Shape extends ZodShape = ZodShape, TExtensions = {}> {
	name: string
	title?: string
	description: string
	input: z.ZodObject<Shape>
	output?: z.ZodTypeAny

	/** CLI argument overrides for individual fields (add shortcuts, custom descriptions, parsers) */
	cli?: Partial<Record<string, Partial<ArgSchema>>>
	/** Options for CLI argument generation (separator, depth, array handling) */
	cliOptions?: CliOptions

	handler: (args: ZodInput<Shape>, ctx: ToolContext<TExtensions>) => Promise<ToolResult>
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
