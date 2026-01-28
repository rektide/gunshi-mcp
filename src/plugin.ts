import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server"
import { packageDirectory } from "package-directory"
import { plugin } from "gunshi/plugin"

export const MCP_PLUGIN_ID = "mcp" as const
export type McpPluginId = typeof MCP_PLUGIN_ID

export interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}

export interface McpPluginOptions {
	port?: number
	promptsDir?: string
}

export default function createMcpPlugin(options: McpPluginOptions = {}) {
	let server: McpServer | undefined

	return plugin({
		id: MCP_PLUGIN_ID,
		name: "MCP Plugin",

		setup: async (ctx) => {
			await packageDirectory()
			server = new McpServer(
				{
					name: "gunshi-mcp-server",
					version: "1.0.0",
				},
				{
					capabilities: {
						tools: {},
						prompts: {},
					},
				},
			)

			ctx.addCommand("mcp", {
				name: "mcp",
				description: "Run the MCP server",
				args: {
					port: {
						type: "number",
						description: "Port for MCP server (optional, defaults to stdio)",
					},
				},
				run: async (ctx) => {
					const args = ctx.values as { port?: number }
					const port = args.port ?? options.port

					console.log(
						"[gunshi-mcp] Starting MCP server...",
						port ? `on port ${port}` : "using stdio",
					)

					if (!server) {
						throw new Error("MCP server not initialized")
					}

					const transport = new StdioServerTransport()
					await server.connect(transport)
					console.log("MCP server running...")
				},
			})
		},

		extension: (_ctx) => {
			return {
				startServer: async (serverOptions?: { port?: number }) => {
					const port = serverOptions?.port ?? options.port
					console.log(
						"[gunshi-mcp] Starting MCP server...",
						port ? `on port ${port}` : "using stdio",
					)

					if (!server) {
						throw new Error("MCP server not initialized")
					}

					const transport = new StdioServerTransport()
					await server.connect(transport)
				},
				stopServer: async () => {
					console.log("[gunshi-mcp] Stopping MCP server...")
				},
			}
		},
	})
}
