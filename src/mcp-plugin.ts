import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { plugin } from "gunshi/plugin";
import type { GunshiArg, GunshiTool } from "./types.js";
import { buildToolContext } from "./context.js";
import {
	reconstructNestedValues,
	zodSchemaToGunshiArgs,
} from "./zod-to-gunshi.js";
import { formatResult } from "./output.js";

export const MCP_NEW_PLUGIN_ID = "gunshi-mcp:mcp" as const;
export type McpNewPluginId = typeof MCP_NEW_PLUGIN_ID;

export interface McpNewPluginOptions {
	tools?: GunshiTool<any, any>[];
	name?: string;
	version?: string;
}

export function createMcpPlugin(options: McpNewPluginOptions = {}) {
	let server: McpServer | undefined;
	const toolDefinitions: GunshiTool<any, any>[] = [];

	return plugin({
		id: MCP_NEW_PLUGIN_ID,
		name: options.name ?? "MCP Plugin",

		setup: async (ctx) => {
			const pluginName = options.name ?? "gunshi-mcp";
			const pluginVersion = options.version ?? "1.0.0";

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
			);

			toolDefinitions.push(...(options.tools ?? []));

			for (const tool of toolDefinitions) {
				const convertedArgs = zodSchemaToGunshiArgs(
					tool.inputSchema,
					tool.cli,
					tool.cliOptions,
				);
				const args: Record<string, GunshiArg> = {};

				for (const [name, field] of Object.entries(convertedArgs)) {
					if (field.required === true) {
						args[name] = field;
					} else {
						args[name] = { ...field, required: undefined };
					}
				}

				const separator = tool.cliOptions?.separator ?? "-";

				ctx.addCommand(tool.name, {
					name: tool.name,
					description: tool.description,
					args: args,
					run: async (cmdCtx) => {
						const mcpExtension = cmdCtx.extensions?.[MCP_NEW_PLUGIN_ID];
						const toolCtx = buildToolContext(
							mcpExtension as Record<string, unknown>,
						);
						const nestedValues = reconstructNestedValues(
							cmdCtx.values,
							separator,
						);
						const parsed = tool.inputSchema.parse(nestedValues);
						const result = await tool.handler(parsed, toolCtx);
						const format = cmdCtx.values.format as "text" | "json" | undefined;
						console.log(formatResult(result, format));
					},
				});
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
						throw new Error("MCP server not initialized");
					}

					const transport = new StdioServerTransport();
					await server.connect(transport);
					console.log("MCP server running...");
				},
			});
		},

		extension: (ctx) => {
			// TODO: extension is meant to populate context, to return something. not to do things!
			// TODO: we also want other plugins: a mcp server that can start the mcp srever, a hono server below that
			for (const tool of toolDefinitions) {
				server?.registerTool(
					tool.name,
					{
						title: tool.title,
						description: tool.description,
						inputSchema: tool.inputSchema,
						outputSchema: tool.outputSchema,
						annotations: tool.annotations,
					},
					async (inputArgs, extra) => {
						const toolCtx = buildToolContext(ctx.extensions, {
							requestId: extra.requestId as string,
						});
						const parsed = tool.inputSchema.parse(inputArgs);
						const result = await tool.handler(parsed, toolCtx);
						return {
							content: [{ type: "text", text: formatResult(result) }],
						};
					},
				);
			}

			return {
				startServer: async () => {
					if (!server) {
						throw new Error("MCP server not initialized");
					}

					const transport = new StdioServerTransport();
					await server.connect(transport);
				},
				stopServer: async () => { },
			};
		},
	});
}
