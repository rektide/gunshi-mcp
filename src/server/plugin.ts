import { plugin } from "gunshi/plugin"
import { REGISTRY_PLUGIN_ID, type RegistryExtension } from "../registry/types.ts"
import { ManagedMcpServer } from "./server.ts"
import { createToolHandler, registerGunshiTool } from "./tools.ts"
import type { ServerExtension, ServerPluginOptions } from "./types.ts"

export const SERVER_PLUGIN_ID = "gunshi-mcp:server" as const
export type ServerPluginId = typeof SERVER_PLUGIN_ID
export { ManagedMcpServer } from "./server.ts"
export type { ServerExtension, ServerPluginOptions } from "./types.ts"

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

			if (options.lazy) {
				registerLazyTools(managedServer, pluginExtensions)
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

async function registerLazyTools(
	managedServer: ManagedMcpServer,
	extensions: Record<string, unknown>,
): Promise<void> {
	const { quickDiscoverToolManifests, createToolLoader } = await import("../discovery/manifest.ts")

	const manifestGenerator = quickDiscoverToolManifests()

	for await (const manifest of manifestGenerator) {
		managedServer.registerTool(
			manifest.name,
			{
				title: manifest.name,
				description: manifest.description,
			},
			async (args: unknown, extra: unknown) => {
				const loaderFn = createToolLoader(manifest)
				const tool = await loaderFn()
				const handlerFactory = createToolHandler(extensions)
				const handler = handlerFactory(tool)
				return handler(args, extra as any)
			},
		)
	}
}
