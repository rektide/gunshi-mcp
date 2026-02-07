import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server"
import type { ServerOptions } from "./types.ts"
import type {
	AnySchema,
	PromptCallback,
	ReadResourceCallback,
	ResourceMetadata,
	ServerCapabilities,
	ToolAnnotations,
	ToolCallback,
	ZodRawShapeCompat,
} from "@modelcontextprotocol/server"

export class ManagedMcpServer {
	private server: McpServer
	private isRunningFlag = false

	constructor(options: ServerOptions = {}) {
		const serverName = options.name ?? "gunshi-mcp"
		const serverVersion = options.version ?? "1.0.0"

		this.server = new McpServer(
			{
				name: serverName,
				version: serverVersion,
			},
			{
				capabilities: options.capabilities ?? ({} as Partial<ServerCapabilities>),
			},
		)
	}

	get rawServer(): McpServer {
		return this.server
	}

	get isRunning(): boolean {
		return this.isRunningFlag
	}

	async start(transport?: "stdio" | "sse"): Promise<void> {
		if (this.isRunningFlag) {
			return
		}

		if (transport === "sse") {
			throw new Error("SSE transport not yet implemented")
		}

		await this.server.connect(new StdioServerTransport())
		this.isRunningFlag = true
	}

	async stop(): Promise<void> {
		if (!this.isRunningFlag) {
			return
		}

		await this.server.close()
		this.isRunningFlag = false
	}

	registerTool(
		name: string,
		config: {
			title?: string
			description?: string
			inputSchema?: AnySchema
			outputSchema?: AnySchema
			annotations?: ToolAnnotations
		},
		handler: ToolCallback<AnySchema>,
	): void {
		this.server.registerTool(name, config, handler)
	}

	registerPrompt(
		name: string,
		config: { title?: string; description?: string; argsSchema?: ZodRawShapeCompat },
		callback: PromptCallback<ZodRawShapeCompat>,
	): void {
		this.server.registerPrompt(name, config, callback)
	}

	registerResource(
		name: string,
		uriOrTemplate: string,
		config: unknown,
		callback: ReadResourceCallback,
	): void {
		this.server.registerResource(name, uriOrTemplate, config as ResourceMetadata, callback)
	}
}
