import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "../types.ts"
import type { DiscoveryOptions } from "./types.ts"
import { discoverTools } from "./discover.ts"
import type { ToolManifest } from "./manifest.ts"
export {
	quickDiscoverToolManifests,
	createToolLoader,
	type ToolManifest,
	type QuickDiscoveryOptions,
} from "./manifest.ts"

export const DISCOVERY_PLUGIN_ID = "gunshi-mcp:discovery" as const
export type DiscoveryPluginId = typeof DISCOVERY_PLUGIN_ID

export interface DiscoveryExtension {
	readonly tools: readonly GunshiTool[]
	readonly manifests: readonly ToolManifest[]
	rediscover: () => Promise<GunshiTool[]>
	hasTool: (name: string) => boolean
	getTool: (name: string) => GunshiTool | undefined
}

export interface DiscoveryPluginOptions extends DiscoveryOptions {
	strict?: boolean
}

export function createDiscoveryPlugin(options: DiscoveryPluginOptions = {}) {
	let discoveredTools: GunshiTool[] = []
	let discoveredManifests: ToolManifest[] = []

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

	const runManifestDiscovery = async (): Promise<ToolManifest[]> => {
		const { quickDiscoverToolManifests } = await import("./manifest.ts")

		const manifests: ToolManifest[] = []
		const generator = quickDiscoverToolManifests(options)

		for await (const manifest of generator) {
			manifests.push(manifest)
		}

		return manifests
	}

	return plugin<{}, DiscoveryPluginId, [], DiscoveryExtension>({
		id: DISCOVERY_PLUGIN_ID,
		name: "Tool Discovery Plugin",

		setup: async (ctx) => {
			discoveredTools = await runDiscovery()
			discoveredManifests = await runManifestDiscovery()

			ctx.addCommand("tools", {
				name: "tools",
				description: "List discovered MCP tools",
				run: () => {
					for (const tool of discoveredTools) {
						console.log(`  ${tool.name} - ${tool.description ?? "(no description)"}`)
					}
				},
			})

			ctx.addCommand("tools:manifests", {
				name: "tools:manifests",
				description: "List discovered tool manifests (for lazy loading)",
				run: () => {
					for (const manifest of discoveredManifests) {
						console.log(
							`  ${manifest.name} - ${manifest.description ?? "(no description)"} (${manifest.path})`,
						)
					}
				},
			})
		},

		extension: (): DiscoveryExtension => ({
			get tools() {
				return Object.freeze([...discoveredTools])
			},
			get manifests() {
				return Object.freeze([...discoveredManifests])
			},
			rediscover: async () => {
				discoveredTools = await runDiscovery()
				discoveredManifests = await runManifestDiscovery()
				return discoveredTools
			},
			hasTool: (name) => discoveredTools.some((t) => t.name === name),
			getTool: (name) => discoveredTools.find((t) => t.name === name),
		}),
	})
}
