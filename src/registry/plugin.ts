import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "../types.ts"
import type { RegistryExtension, RegistryPluginOptions } from "./types.ts"
import { ToolRegistry } from "./registry.js"
import { REGISTRY_PLUGIN_ID } from "./types.ts"

export function createRegistryPlugin(options: RegistryPluginOptions = {}) {
	const { tools = [], onConflict = "skip" } = options
	const registry = new ToolRegistry({ onConflict })

	registry.registerAll(tools)

	return plugin({
		id: REGISTRY_PLUGIN_ID,
		name: "Registry Plugin",
		extension: () => {
			const extension: RegistryExtension = {
				register: (tool: GunshiTool) => {
					registry.register(tool)
				},
				unregister: (name: string) => {
					return registry.unregister(name)
				},
				list: () => {
					return registry.list()
				},
				get: (name: string) => {
					return registry.get(name)
				},
				has: (name: string) => {
					return registry.has(name)
				},
				clear: () => {
					registry.clear()
				},
				get count() {
					return registry.count
				},
			}

			return extension
		},
	})
}

export { ToolRegistry }

export { REGISTRY_PLUGIN_ID }
