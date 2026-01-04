import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { packageDirectory } from "package-directory"
import type { Plugin } from "gunshi/plugin"
import type { McpPluginOptions, McpExtension } from "./types.js"
import { plugin } from "gunshi/plugin"
import * as path from "node:path"

export const MCP_PLUGIN_ID = "mcp"

export type { McpExtension }

interface PluginContext {
	projectRoot?: string
	promptsPath: string
}

/**
 * Creates a gunshi plugin that provides MCP server functionality
 *
 * @param options - Configuration options for the MCP plugin
 * @param options.port - Port for MCP HTTP server (optional, defaults to stdio)
 * @param options.promptsDir - Custom prompts directory path (defaults to {projectRoot}/prompts)
 * @param options.debug - Enable debug logging
 *
 * @returns A gunshi plugin that can be registered with the gunshi app
 *
 * @example
 * ```ts
 * import createMcpPlugin from 'gunshi-mcp'
 *
 * app.use(createMcpPlugin({
 *   promptsDir: './custom-prompts',
 *   debug: true
 * }))
 * ```
 */
export default function createMcpPlugin(options: McpPluginOptions = {}): Plugin {
	let pluginContext: PluginContext | undefined
	let server: McpServer | undefined

	return plugin({
		id: MCP_PLUGIN_ID,
		name: "MCP Plugin",

		setup: async (ctx) => {
			const projectRoot = await packageDirectory()
			pluginContext = {
				projectRoot,
				promptsPath:
					options.promptsDir ?? (projectRoot ? path.join(projectRoot, "prompts") : "prompts"),
			}

			const serverName = "gunshi-mcp-server"
			const serverVersion = "1.0.0"

			server = new McpServer(
				{
					name: serverName,
					version: serverVersion,
				},
				{
					capabilities: {
						tools: {},
						prompts: {},
					},
				},
			)

			if (options.debug) {
				console.log("[gunshi-mcp] MCP server initialized:", {
					name: serverName,
					version: serverVersion,
				})
			}

			ctx.addCommand("mcp", {
				name: "mcp",
				description: "Run the MCP server for Model Context Protocol integration",
				args: {
					port: {
						type: "number",
						description: "Port for MCP server (optional, defaults to config)",
					},
				},
				run: async (ctx) => {
					const args = ctx.values
					const port = (args.port as number | undefined) ?? options.port
					if (options.debug) {
						console.log(
							"[gunshi-mcp] Starting MCP server...",
							port ? `on port ${port}` : "using stdio",
						)
					}
					console.log("MCP server running...")
				},
			})

			if (options.debug) {
				console.log("[gunshi-mcp] Plugin initialized with options:", options)
				console.log("[gunshi-mcp] Project root:", pluginContext.projectRoot)
				console.log("[gunshi-mcp] Prompts path:", pluginContext.promptsPath)
			}
		},

		extension: () => {
			return {
				startServer: async (serverOptions?: { port?: number }) => {
					const port = serverOptions?.port ?? options.port
					if (options.debug) {
						console.log(
							"[gunshi-mcp] Starting MCP server...",
							port ? `on port ${port}` : "using stdio",
						)
					}
				},
				stopServer: async () => {
					if (options.debug) {
						console.log("[gunshi-mcp] Stopping MCP server...")
					}
				},
			}
		},
	})
}
