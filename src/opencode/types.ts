import type { GunshiTool } from "../types.ts"

export const OPENCODE_PLUGIN_ID = "gunshi-mcp:opencode" as const
export type OpenCodePluginId = typeof OPENCODE_PLUGIN_ID

export interface OpenCodeExtension {
	readonly isOpenCodeEnvironment: boolean
	readonly exposedTools: readonly string[]
	expose: (tool: GunshiTool) => void
	exposeAll: () => void
}

export interface OpenCodePluginOptions {
	include?: string[]
	exclude?: string[]
	autoExpose?: boolean
}

export interface OpenCodeToolContext {
	agent: string
	sessionID: string
	messageID: string
	directory: string
	worktree: string
}
