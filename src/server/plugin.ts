import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "../types.ts"
import { REGISTRY_PLUGIN_ID, type RegistryExtension } from "../registry/types.ts"
import { ManagedMcpServer } from "./server.ts"
import { createToolHandler, registerGunshiTool } from "./tools.ts"
import type { ServerOptions } from "./types.ts"
import type {
	PromptCallback,
	ReadResourceCallback,
	ResourceMetadata,
	ZodRawShapeCompat,
} from "@modelcontextprotocol/server"

export const SERVER_PLUGIN_ID = "gunshi-mcp:server" as const
export type ServerPluginId = typeof SERVER_PLUGIN_ID
export { ManagedMcpServer } from "./server.ts"

export interface ServerExtension {
	readonly server: ManagedMcpServer
	readonly isRunning: boolean
	start: (transport?: "stdio" | "sse") => Promise<void>
	stop: () => Promise<void>
	registerTool: (tool: GunshiTool) => void
	registerTools: (tools: GunshiTool[]) => void
	registerPrompt: (
		name: string,
		config: { title?: string; description?: string; argsSchema?: ZodRawShapeCompat },
		callback: PromptCallback<ZodRawShapeCompat>,
	) => void
	registerResource: (
		name: string,
		uriOrTemplate: string,
		config: ResourceMetadata,
		callback: ReadResourceCallback,
	) => void
}

export interface ServerPluginOptions extends ServerOptions {
	autoRegister?: boolean
	tools?: GunshiTool[]
}

type Deps = {
	[REGISTRY_PLUGIN_ID]?: RegistryExtension
}

const deps = [REGISTRY_PLUGIN_ID] as const

export function createServerPlugin(options: ServerPluginOptions = {}) {
	let managedServer: ManagedMcpServer
	let pluginExtensions: Record<string, unknown> = {}

	return plugin<Deps, ServerPluginId, typeof deps, ServerExtension>({
		id: SERVER_PLUGIN_ID,
		name: "MCP Server Plugin",
		dependencies: deps,

		setup: async (ctx) => {
			managedServer = new ManagedMcpServer({
				name: options.name,
				version: options.version,
				capabilities: options.capabilities,
				transport: options.transport,
			})

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
					const serverExt = cmdCtx.extensions[SERVER_PLUGIN_ID]
					const transport = cmdCtx.values.port ? "sse" : "stdio"
					await serverExt.start(transport)
				},
			})
		},

		extension: (ctx) => {
			pluginExtensions = ctx.extensions as Record<string, unknown>

			if (options.autoRegister) {
				const registry = ctx.extensions[REGISTRY_PLUGIN_ID]
				if (registry) {
					const tools = registry.list()
					for (const tool of tools) {
						const handlerFactory = createToolHandler(pluginExtensions)
						const handler = handlerFactory(tool)
						registerGunshiTool(managedServer, tool, handler)
					}
				}
			}

			if (options.tools) {
				for (const tool of options.tools) {
					const handlerFactory = createToolHandler(pluginExtensions)
					const handler = handlerFactory(tool)
					registerGunshiTool(managedServer, tool, handler)
				}
			}

			return {
				get server() {
					return managedServer
				},
				get isRunning() {
					return managedServer.isRunning
				},
				start: async (transport) => {
					await managedServer.start(transport)
				},
				stop: async () => {
					await managedServer.stop()
				},
				registerTool: (tool) => {
					const handlerFactory = createToolHandler(pluginExtensions)
					const handler = handlerFactory(tool)
					registerGunshiTool(managedServer, tool, handler)
				},
				registerTools: (tools) => {
					for (const tool of tools) {
						const handlerFactory = createToolHandler(pluginExtensions)
						const handler = handlerFactory(tool)
						registerGunshiTool(managedServer, tool, handler)
					}
				},
				registerPrompt: (name, config, callback) => {
					managedServer.registerPrompt(name, config, callback)
				},
				registerResource: (name, uriOrTemplate, config, callback) => {
					managedServer.registerResource(name, uriOrTemplate, config, callback)
				},
			}
		},
	})
}
