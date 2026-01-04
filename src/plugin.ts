import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
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
	commands: ReadonlyMap<string, unknown>
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
	const logger = options.logger || {
		info: (msg, ...args) => {
			console.log(msg, ...args)
		},
		warn: (msg, ...args) => {
			console.warn(msg, ...args)
		},
		error: (msg, ...args) => {
			console.error(msg, ...args)
		},
		debug: (msg, ...args) => {
			if (options.debug) {
				console.log(msg, ...args)
			}
		},
		trace: () => {},
		fatal: (msg, ...args) => {
			console.error(msg, ...args)
		},
		child: () => ({
			info: () => {},
			warn: () => {},
			error: () => {},
			debug: () => {},
			trace: () => {},
			fatal: () => {},
		}),
		setLevel: () => {},
	}

	let pluginContext: PluginContext | undefined
	let server: McpServer | undefined
	let isShuttingDown = false

	const setupShutdownHandlers = () => {
		const shutdown = async (signal: string) => {
			if (isShuttingDown) {
				return
			}
			isShuttingDown = true
			logger.info(`Received ${signal}, shutting down...`)
			process.exit(0)
		}

		process.on("SIGTERM", () => shutdown("SIGTERM"))
		process.on("SIGINT", () => shutdown("SIGINT"))
	}

	return plugin({
		id: MCP_PLUGIN_ID,
		name: "MCP Plugin",

		setup: async (ctx) => {
			const projectRoot = await packageDirectory()
			pluginContext = {
				projectRoot,
				promptsPath:
					options.promptsDir ?? (projectRoot ? path.join(projectRoot, "prompts") : "prompts"),
				commands: ctx.subCommands,
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

			setupShutdownHandlers()

			logger.debug("[gunshi-mcp] MCP server initialized:", {
				name: serverName,
				version: serverVersion,
			})

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
					logger.debug(
						"[gunshi-mcp] Starting MCP server...",
						port ? `on port ${port}` : "using stdio",
					)

					if (!server) {
						throw new Error("MCP server not initialized")
					}

					const transport = new StdioServerTransport()
					logger.debug("Connecting stdio transport...")
					await server.connect(transport)
					logger.info("MCP server running...")
				},
			})

			logger.debug("[gunshi-mcp] Plugin initialized with options:", options)
			logger.debug("[gunshi-mcp] Project root:", pluginContext.projectRoot)
			logger.debug("[gunshi-mcp] Prompts path:", pluginContext.promptsPath)
			logger.debug(
				"[gunshi-mcp] Registered commands:",
				Array.from(pluginContext.commands.keys()).join(", "),
			)
		},

		extension: () => {
			return {
				startServer: async (serverOptions?: { port?: number }) => {
					const port = serverOptions?.port ?? options.port
					logger.debug(
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
					logger.debug("[gunshi-mcp] Stopping MCP server...")
					// Server will close when stdio transport ends
				},
			}
		},
	})
}
