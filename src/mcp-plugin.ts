import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { plugin } from "gunshi/plugin"
import type { ToolDefinition, GunshiArg } from "./types.js"
import { buildToolContext } from "./context.js"
import { zodSchemaToGunshiArgs } from "./zod-to-gunshi.js"
import { formatResult } from "./output.js"

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export interface McpNewPluginOptions {
	tools?: ToolDefinition[]
	name?: string
	version?: string
}

export function createMcpPlugin(options: McpNewPluginOptions = {}) {
	let server: McpServer | undefined
	const toolDefinitions: ToolDefinition[] = []

	return plugin({
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

			toolDefinitions.push(...(options.tools ?? []))

			for (const tool of toolDefinitions) {
				const convertedArgs = zodSchemaToGunshiArgs(
					tool.inputSchema as Record<string, unknown>,
					tool.cli?.args as Record<string, Partial<GunshiArg>> | undefined,
				)
				const args: Record<string, GunshiArg> = {}

				for (const [name, field] of Object.entries(convertedArgs)) {
					if (field.required === true) {
						args[name] = field
					} else {
						args[name] = { ...field, required: undefined }
					}
				}

				ctx.addCommand(tool.name, {
					name: tool.name,
					description: tool.description,
					args: args,
					run: async (cmdCtx) => {
						const toolCtx = buildToolContext(cmdCtx.extensions as any)
						const result = await tool.handler(cmdCtx.values as any, toolCtx)
						console.log(formatResult(result, cmdCtx.values.format as "text" | "json" | undefined))
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
				run: async () => {
					if (!server) {
						throw new Error("MCP server not initialized")
					}

					const transport = new StdioServerTransport()
					await server.connect(transport)
					console.log("MCP server running...")
				},
			})
		},

		extension: (ctx) => {
			for (const tool of toolDefinitions) {
				server?.registerTool(
					tool.name,
					{
						title: tool.title,
						description: tool.description,
						inputSchema: tool.inputSchema as any,
						outputSchema: tool.outputSchema as any,
					},
					async (inputArgs: any, extra: any) => {
						const toolCtx = buildToolContext(ctx.extensions as any, {
							requestId: extra?.requestId,
						})
						const result = await tool.handler(inputArgs as any, toolCtx)
						return {
							type: "tool_result",
							toolUseId: tool.name,
							content: [
								{
									type: "text",
									text: formatResult(result),
									annotations: extra?.annotations as any,
								},
							],
						} as any
					},
				)
			}

			return {
				startServer: async () => {
					if (!server) {
						throw new Error("MCP server not initialized")
					}

					const transport = new StdioServerTransport()
					await server.connect(transport)
				},
				stopServer: async () => {},
			}
		},
	})
}
