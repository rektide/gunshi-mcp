import type { GunshiTool } from "../types.ts"

export interface ServerToolRegistration {
	name: string
	tool: unknown
	handler: (args: unknown, extra: unknown) => Promise<unknown>
}

export interface ServerOptions {
	name?: string
	version?: string
	capabilities?: {
		tools?: Record<string, unknown>
		prompts?: Record<string, unknown>
		resources?: Record<string, unknown>
	}
	transport?: "stdio" | "sse"
}

export interface ToolHandlerExtra {
	requestId?: string
}

export type ToolHandler = (
	args: unknown,
	extra: ToolHandlerExtra,
	tool: GunshiTool,
) => Promise<unknown>

export interface ServerExtension {
	readonly server: unknown
	readonly isRunning: boolean
	start: (transport?: "stdio" | "sse") => Promise<void>
	stop: () => Promise<void>
	registerTool: (tool: GunshiTool) => void
	registerTools: (tools: GunshiTool[]) => void
	registerPrompt: (prompt: unknown) => void
	registerResource: (resource: unknown) => void
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
}
