import type { z } from "zod"
import type { CliOptions } from "./cli-args/types.ts"
import type { ArgSchema } from "gunshi"
import type { CallToolResult, Tool } from "@modelcontextprotocol/server"

export type { CliOptions } from "./cli-args/types.ts"
export type GunshiArg = ArgSchema
export type ToolResult = CallToolResult
export type { Tool } from "@modelcontextprotocol/server"

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

export interface GunshiTool<Shape extends ZodShape = ZodShape, TExtensions = {}> extends Omit<
	Tool,
	"inputSchema" | "outputSchema"
> {
	inputSchema: z.ZodObject<Shape>
	outputSchema?: z.ZodTypeAny

	cli?: Partial<Record<string, Partial<ArgSchema>>>
	cliOptions?: CliOptions

	handler: (args: ZodInput<Shape>, ctx: ToolContext<TExtensions>) => Promise<ToolResult>
}

export type AnyGunshiTool = GunshiTool<any, any>

export interface McpToolExtra {
	requestId?: string
}

export interface JsonSchema {
	type: string
	properties?: Record<string, object>
	required?: string[]
	additionalProperties?: boolean
}
