import type { GunshiTool } from "../types.js"

export interface RegistryExtension {
	register: (tool: GunshiTool) => void
	unregister: (name: string) => boolean
	list: () => readonly GunshiTool[]
	get: (name: string) => GunshiTool | undefined
	has: (name: string) => boolean
	clear: () => void
	readonly count: number
}

export interface RegistryPluginOptions {
	tools?: GunshiTool[]
	autoDiscover?: boolean
	onConflict?: "replace" | "skip" | "error"
}

export const REGISTRY_PLUGIN_ID = "gunshi-mcp:registry" as const
export type RegistryPluginId = typeof REGISTRY_PLUGIN_ID
