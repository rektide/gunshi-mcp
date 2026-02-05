import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server"
import { plugin } from "gunshi/plugin"
import type { GunshiArg, GunshiTool } from "./types.js"
import { buildToolContext } from "./context.js"
import { reconstructNestedValues, zodSchemaToGunshiArgs } from "./zod-to-gunshi.js"
import { formatResult } from "./output.js"

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export interface McpExtension {
	registerTools: (tools: GunshiTool<any, any>[]) => void
	startServer: () => Promise<void>
	stopServer: () => Promise<void>
}

export interface McpNewPluginOptions {
	tools?: GunshiTool<any, any>[]
	name?: string
	version?: string
}

export function createMcpPlugin(options: McpNewPluginOptions = {}) {
	let server: McpServer | undefined
	let pluginExtensions: Record<string, unknown> | undefined

	const registerTools = (tools: GunshiTool<any, any>[]) => {
		if (!server || !pluginExtensions) {
			throw new Error("MCP plugin not initialized")
		}

		for (const tool of tools) {
			server.registerTool(
				tool.name,
				{
					title: tool.title,
					description: tool.description,
					inputSchema: tool.inputSchema,
					outputSchema: tool.outputSchema,
					annotations: tool.annotations,
				},
				async (inputArgs, extra) => {
					const toolCtx = buildToolContext(pluginExtensions, {
						requestId: extra.requestId as string,
					})
					const parsed = tool.inputSchema.parse(inputArgs)
					const result = await tool.handler(parsed, toolCtx)
					return {
						content: [{ type: "text", text: formatResult(result) }],
					}
				},
			)
		}
	}

	return plugin<{}, McpNewPluginId, [], McpExtension>({
		id: MCP_NEW_PLUGIN_ID,
		name: options.name ?? "MCP Plugin",

		setup: async (ctx) => {

			const pluginName = options.name ?? "gunshi-mcp"
			const pluginVersion = options.version ?? "1.0.0"

			server = new McpServer(
				{
					name: pluginName,
					version: pluginVersion,
				},
				{
					capabilities: {
						tools: {},
						prompts: {},
					},
				},
			)

			const toolDefinitions = options.tools ?? []

			for (const tool of toolDefinitions) {
				const convertedArgs = zodSchemaToGunshiArgs(tool.inputSchema, tool.cli, tool.cliOptions)
				const args: Record<string, GunshiArg> = {}

				for (const [name, field] of Object.entries(convertedArgs)) {
					if (field.required === true) {
						args[name] = field
					} else {
						args[name] = { ...field, required: undefined }
					}
				}

				const separator = tool.cliOptions?.separator ?? "-"

				ctx.addCommand(tool.name, {
					name: tool.name,
					description: tool.description,
					args: args,
					run: async (cmdCtx) => {
						const mcpExtension = cmdCtx.extensions?.[MCP_NEW_PLUGIN_ID] as McpExtension
						const toolCtx = buildToolContext({
							mcp: mcpExtension,
						})
						const nestedValues = reconstructNestedValues(cmdCtx.values, separator)
						const parsed = tool.inputSchema.parse(nestedValues)
						const result = await tool.handler(parsed, toolCtx)
						const format = cmdCtx.values.format as "text" | "json" | undefined
						console.log(formatResult(result, format))
					},
				})
			}

			ctx.addCommand("mcp", {
				name: "mcp",
				description: "Run MCP server",
				args: {
					port: {
						type: "number",
						description: "Port for MCP server (optional, defaults to stdio)",
					},
				},
				run: async (cmdCtx) => {
					const mcpExtension = cmdCtx.extensions?.[MCP_NEW_PLUGIN_ID] as McpExtension
					registerTools(toolDefinitions)
					await mcpExtension.startServer()
				},
			})
		},

		extension: (ctx) => {
			pluginExtensions = (ctx as any).extensions
			return {
				registerTools,
				startServer: async () => {
					if (!server) {
						throw new Error("MCP server not initialized")
					}
					const transport = new StdioServerTransport()
					await server.connect(transport)
				},
				stopServer: async () => {
				},
			}
		},
	})
}
