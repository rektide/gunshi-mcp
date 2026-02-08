import { cli } from "gunshi"
import type { GunshiTool } from "../types.ts"
import { isOpenCodeEnvironment } from "./detection.ts"
import { convertToOpenCodeTool, type OpenCodeToolDefinition } from "./exposure.ts"
import type { OpenCodePluginOptions } from "./types.ts"

export interface InstallOpenCodeToolsOptions extends OpenCodePluginOptions {
	tools?: GunshiTool[]
}

const installedTools = new Map<string, OpenCodeToolDefinition>()

export function installOpenCodeTools(options: InstallOpenCodeToolsOptions = {}): boolean {
	if (!isOpenCodeEnvironment()) {
		return false
	}

	const { tools = [], include, exclude } = options

	for (const tool of tools) {
		if (exclude && exclude.includes(tool.name)) {
			continue
		}

		if (include && include.length > 0 && !include.includes(tool.name)) {
			continue
		}

		const def = convertToOpenCodeTool(tool, {})
		installedTools.set(tool.name, def)
	}

	return true
}

export function getInstalledTools(): ReadonlyMap<string, OpenCodeToolDefinition> {
	return installedTools
}

export function createOpenCodeToolExport(tool: GunshiTool): OpenCodeToolDefinition {
	return convertToOpenCodeTool(tool, {})
}

export interface OpenCodeMainOptions {
	tools: GunshiTool[]
	name?: string
	version?: string
	include?: string[]
	exclude?: string[]
}

export async function openCodeMain(options: OpenCodeMainOptions): Promise<void> {
	const { tools, name = "gunshi-mcp-opencode", version = "1.0.0", include, exclude } = options

	const { createRegistryPlugin } = await import("../registry/plugin.ts")
	const { createOpenCodePlugin } = await import("./plugin.ts")

	const filteredTools = tools.filter((tool) => {
		if (exclude && exclude.includes(tool.name)) return false
		if (include && include.length > 0 && !include.includes(tool.name)) return false
		return true
	})

	const command = {
		name: "opencode",
		description: "OpenCode tool runner",
		run: () => {
			console.log(`${name} v${version} - OpenCode tools installed`)
			for (const tool of filteredTools) {
				console.log(`  ${tool.name} - ${tool.description ?? "(no description)"}`)
			}
		},
	}

	await cli(process.argv.slice(2), command, {
		name,
		version,
		plugins: [
			createRegistryPlugin({ tools: filteredTools }),
			createOpenCodePlugin({ autoExpose: true }),
		],
	})
}

export { isOpenCodeEnvironment }
