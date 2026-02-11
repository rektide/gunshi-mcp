import type { GunshiTool } from "../types.ts"
import type {
	ServerCapabilities,
	PromptCallback,
	ReadResourceCallback,
	ResourceMetadata,
	ZodRawShapeCompat,
} from "@modelcontextprotocol/server"
import type { ManagedMcpServer } from "./server.ts"

export interface ServerOptions {
	name?: string
	version?: string
	capabilities?: Partial<ServerCapabilities>
	transport?: "stdio" | "sse"
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
	lazy?: boolean
}

export interface ServerExtension {
	readonly server: ManagedMcpServer
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
		config: ResourceMetadata,
		callback: ReadResourceCallback,
	) => void
}
