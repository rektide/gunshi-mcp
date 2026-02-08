import type { GunshiTool, GunshiArg } from "../types.ts"

export const CLI_PLUGIN_ID = "gunshi-mcp:cli" as const
export type CliPluginId = typeof CLI_PLUGIN_ID

export interface CliPluginOptions {
	prefix?: string
	separator?: string
	formatFlag?: boolean
	arrayHandling?: "json" | "repeated"
}

export interface CliExtension {
	readonly commands: readonly string[]
	refresh(): void
}

export interface GenerateCommandContext {
	extensions: {
		schema: {
			flatten: <T extends { shape: unknown }>(
				schema: T,
				options?: { separator?: string; maxDepth?: number },
			) => Array<{
				key: string
				info: {
					type: string
					required: boolean
					default?: unknown
					description?: string
					enumValues?: string[]
				}
				optional: boolean
			}>
		}
		registry: {
			list: () => readonly GunshiTool[]
		}
	}
	options: CliPluginOptions
	addCommand: (
		name: string,
		definition: {
			args: Record<string, GunshiArg>
			handler: (...args: unknown[]) => unknown
		},
	) => void
}
