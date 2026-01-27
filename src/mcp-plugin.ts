import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { plugin } from "gunshi/plugin"
import type { ToolDefinition, ToolContext, ToolResult, GunshiArg } from "./types.js"
import { zodSchemaToGunshiArgs } from "./zod-to-gunshi.js"

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID

export interface McpNewPluginOptions {
	tools?: ToolDefinition[]
	name?: string
	version?: string
}

interface McpToolExtra {
	requestId?: string
}

function buildToolContext<E>(extensions: E, mcpExtra?: McpToolExtra): ToolContext<E> {
	return {
		extensions,
		log: {
			info: (msg: string, ...args: unknown[]) => console.log(msg, ...args),
			warn: (msg: string, ...args: unknown[]) => console.warn(msg, ...args),
			error: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
			debug: (msg: string, ...args: unknown[]) => console.debug(msg, ...args),
			trace: (msg: string, ...args: unknown[]) => console.trace(msg, ...args),
			fatal: (msg: string, ...args: unknown[]) => console.error(msg, ...args),
		},
		meta: {
			requestId: mcpExtra?.requestId,
		},
	}
}

function extractText(result: ToolResult): string {
	return result.content
		.filter((c) => c.type === "text")
		.map((c) => c.text)
		.join("\n")
}

function formatResult(result: ToolResult, format?: "text" | "json"): string {
	if (format === "json" && result.structuredContent) {
		return JSON.stringify(result.structuredContent, null, 2)
	}
	return extractText(result)
}

export function createMcpPlugin(options: McpNewPluginOptions = {}) {
	let server: McpServer | undefined

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

			for (const tool of options.tools ?? []) {
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

		extension: (_ctx) => {
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
