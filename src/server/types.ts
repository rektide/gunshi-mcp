import type { GunshiTool } from "../types.ts"
import type {
	McpServer,
	PromptCallback,
	ReadResourceCallback,
	ServerCapabilities,
	ZodRawShapeCompat,
} from "@modelcontextprotocol/server"

export interface ServerOptions {
	name?: string
	version?: string
	capabilities?: Partial<ServerCapabilities>
	transport?: "stdio" | "sse"
}

export interface ServerExtension {
	readonly server: McpServer
	readonly isRunning: boolean
	start: (transport?: "stdio" | "sse") => Promise<void>
	stop: () => Promise<void>
	registerTool: (tool: GunshiTool) => void
	registerTools: (tools: GunshiTool[]) => void
	registerPrompt: (
		name: string,
		config: { title?: string; description?: string; argsSchema?: ZodRawShapeCompat },
		callback: PromptCallback<ZodRawShapeCompat>,
	) => void
	registerResource: (
		name: string,
		uriOrTemplate: string,
		config: unknown,
		callback: ReadResourceCallback,
	) => void
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
}

export interface ServerExtension {
	readonly server: McpServer
	readonly isRunning: boolean
	start: (transport?: "stdio" | "sse") => Promise<void>
	stop: () => Promise<void>
	registerTool: (tool: GunshiTool) => void
	registerTools: (tools: GunshiTool[]) => void
	registerPrompt: (
		name: string,
		config: { title?: string; description?: string; argsSchema?: ZodRawShapeCompat },
		callback: PromptCallback<ZodRawShapeCompat>,
	) => void
	registerResource: (
		name: string,
		uriOrTemplate: string,
		config: unknown,
		callback: ReadResourceCallback,
	) => void
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
}
