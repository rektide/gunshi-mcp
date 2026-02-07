import { glob } from "tinyglobby"
import { pathToFileURL } from "node:url"
import type { GunshiTool } from "../types.ts"
import type { ToolDiscovery, GlobToolDiscoveryOptions } from "./types.ts"
import { DEFAULT_PATTERNS, DEFAULT_IGNORE } from "./types.ts"

export function globToolDiscovery(options: GlobToolDiscoveryOptions = {}): ToolDiscovery {
	const patterns = options.patterns ?? DEFAULT_PATTERNS
	const ignore = options.ignore ?? DEFAULT_IGNORE

	return async function* (rootDir: string) {
		const files = await glob(patterns, { cwd: rootDir, ignore, absolute: true })

		for (const file of files) {
			const mod = await import(pathToFileURL(file).href)
			const tools = extractTools(mod)
			for (const tool of tools) {
				yield tool
			}
		}
	}
}

export function extractTools(mod: unknown): GunshiTool[] {
	const tools: GunshiTool[] = []

	if (!mod || typeof mod !== "object") return tools

	if ("default" in mod && isGunshiTool(mod.default)) {
		tools.push(mod.default)
	}

	for (const [key, value] of Object.entries(mod)) {
		if (key !== "default" && isGunshiTool(value)) {
			tools.push(value)
		}
	}

	return tools
}

export function isGunshiTool(value: unknown): value is GunshiTool {
	return (
		value !== null &&
		typeof value === "object" &&
		"name" in value &&
		"handler" in value &&
		"inputSchema" in value &&
		typeof (value as any).handler === "function"
	)
}
