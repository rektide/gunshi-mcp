import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "../types.ts"
import type { DiscoveryOptions } from "./types.ts"
import { discoverTools } from "./discover.ts"

export const DISCOVERY_PLUGIN_ID = "gunshi-mcp:discovery" as const
export type DiscoveryPluginId = typeof DISCOVERY_PLUGIN_ID

export interface DiscoveryExtension {
	readonly tools: readonly GunshiTool[]
	rediscover: () => Promise<GunshiTool[]>
	hasTool: (name: string) => boolean
	getTool: (name: string) => GunshiTool | undefined
}

export interface DiscoveryPluginOptions extends DiscoveryOptions {
	strict?: boolean
}

export function createDiscoveryPlugin(options: DiscoveryPluginOptions = {}) {
	let discoveredTools: GunshiTool[] = []

	const runDiscovery = async (): Promise<GunshiTool[]> => {
		const rootDiscovery = options.roots
		const toolDiscovery = options.tools

		if (!rootDiscovery || !toolDiscovery) {
			return await discoverTools(options)
		}

		const tools: GunshiTool[] = []
		for await (const rootDir of rootDiscovery()) {
			for await (const tool of toolDiscovery(rootDir)) {
				tools.push(tool)
			}
		}
		return tools
	}

	return plugin<{}, DiscoveryPluginId, [], DiscoveryExtension>({
		id: DISCOVERY_PLUGIN_ID,
		name: "Tool Discovery Plugin",

		setup: async (ctx) => {
			discoveredTools = await runDiscovery()

			ctx.addCommand("tools", {
				name: "tools",
				description: "List discovered MCP tools",
				run: () => {
					for (const tool of discoveredTools) {
						console.log(`  ${tool.name} - ${tool.description ?? "(no description)"}`)
					}
				},
			})
		},

		extension: (): DiscoveryExtension => ({
			get tools() {
				return Object.freeze([...discoveredTools])
			},
			rediscover: async () => {
				discoveredTools = await runDiscovery()
				return discoveredTools
			},
			hasTool: (name) => discoveredTools.some((t) => t.name === name),
			getTool: (name) => discoveredTools.find((t) => t.name === name),
		}),
	})
}
