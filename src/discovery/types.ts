import type { GunshiTool } from "../types.ts"

export type RootDiscovery = () => AsyncGenerator<string, void, undefined>

export type ToolDiscovery = (rootDir: string) => AsyncGenerator<GunshiTool, void, undefined>

export interface DiscoveryOptions {
	roots?: RootDiscovery
	tools?: ToolDiscovery
	strict?: boolean
}

export interface GlobToolDiscoveryOptions {
	patterns?: string[]
	ignore?: string[]
}

export const DEFAULT_PATTERNS = ["tools/**/*.{js,ts}", "src/tools/**/*.{js,ts}"]

export const DEFAULT_IGNORE = [
	"**/*.test.{js,ts}",
	"**/*.spec.{js,ts}",
	"**/_*.{js,ts}",
	"**/node_modules/**",
]
