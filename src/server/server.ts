import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server"
import type { ServerOptions } from "./types.ts"
import type { CallToolResult } from "@modelcontextprotocol/server"

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
				capabilities: {
					tools: options.capabilities?.tools ?? {},
					prompts: options.capabilities?.prompts ?? {},
					resources: options.capabilities?.resources ?? {},
				},
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
		tool: {
			name: string
			title?: string
			description?: string
			inputSchema: unknown
			outputSchema?: unknown
			annotations?: unknown
		},
		handler: (args: unknown, extra: unknown) => Promise<CallToolResult>,
	): void {
		this.server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema as any,
				outputSchema: tool.outputSchema as any,
				annotations: tool.annotations as any,
			},
			handler,
		)
	}

	registerPrompt(name: string, config: unknown, callback: unknown): void {
		this.server.registerPrompt(name, config as any, callback as any)
	}

	registerResource(name: string, uriOrTemplate: string, config: unknown, callback: unknown): void {
		this.server.registerResource(name, uriOrTemplate, config as any, callback as any)
	}
}
