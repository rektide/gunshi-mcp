import type { GunshiTool } from "../types.ts"
import type { DiscoveryOptions } from "./types.ts"
import { defaultRootDiscovery } from "./roots.ts"
import { globToolDiscovery } from "./tools.ts"

export { defaultRootDiscovery, explicitRoots, chainRoots } from "./roots.ts"
export { globToolDiscovery, extractTools, isGunshiTool } from "./tools.ts"

export async function discoverTools(options: DiscoveryOptions = {}): Promise<GunshiTool[]> {
	const rootDiscovery = options.roots ?? defaultRootDiscovery
	const toolDiscovery = options.tools ?? globToolDiscovery()

	const tools: GunshiTool[] = []

	for await (const rootDir of rootDiscovery()) {
		for await (const tool of toolDiscovery(rootDir)) {
			tools.push(tool)
		}
	}

	return tools
}

export async function* discoverToolsStream(
	options: DiscoveryOptions = {},
): AsyncGenerator<GunshiTool> {
	const rootDiscovery = options.roots ?? defaultRootDiscovery
	const toolDiscovery = options.tools ?? globToolDiscovery()

	for await (const rootDir of rootDiscovery()) {
		yield* toolDiscovery(rootDir)
	}
}
