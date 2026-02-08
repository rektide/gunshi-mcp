import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "../types.ts"
import { REGISTRY_PLUGIN_ID, type RegistryExtension } from "../registry/types.ts"
import { isOpenCodeEnvironment } from "./detection.ts"
import { convertToOpenCodeTool, filterTools, type OpenCodeToolDefinition } from "./exposure.ts"
import type { OpenCodeExtension, OpenCodePluginOptions } from "./types.ts"
import { OPENCODE_PLUGIN_ID } from "./types.ts"

type Deps = {
	[REGISTRY_PLUGIN_ID]?: RegistryExtension
}

const deps = [REGISTRY_PLUGIN_ID] as const

export function createOpenCodePlugin(options: OpenCodePluginOptions = {}) {
	const exposedToolNames: string[] = []
	const toolDefinitions = new Map<string, OpenCodeToolDefinition>()
	let pluginExtensions: Record<string, unknown> = {}

	return plugin<Deps, typeof OPENCODE_PLUGIN_ID, typeof deps, OpenCodeExtension>({
		id: OPENCODE_PLUGIN_ID,
		name: "OpenCode Plugin",
		dependencies: deps,

		extension: (ctx) => {
			pluginExtensions = ctx.extensions as Record<string, unknown>
			const inOpenCode = isOpenCodeEnvironment()

			const exposeToolInternal = (tool: GunshiTool) => {
				if (!exposedToolNames.includes(tool.name)) {
					exposedToolNames.push(tool.name)
					const def = convertToOpenCodeTool(tool, pluginExtensions)
					toolDefinitions.set(tool.name, def)
				}
			}

			if (options.autoExpose && inOpenCode) {
				const registry = ctx.extensions[REGISTRY_PLUGIN_ID]
				if (registry) {
					const tools = filterTools(registry.list(), options)
					for (const tool of tools) {
						exposeToolInternal(tool)
					}
				}
			}

			return {
				get isOpenCodeEnvironment() {
					return inOpenCode
				},
				get exposedTools() {
					return Object.freeze([...exposedToolNames])
				},
				expose: (tool) => {
					if (filterTools([tool], options).length > 0) {
						exposeToolInternal(tool)
					}
				},
				exposeAll: () => {
					const registry = ctx.extensions[REGISTRY_PLUGIN_ID]
					if (registry) {
						const tools = filterTools(registry.list(), options)
						for (const tool of tools) {
							exposeToolInternal(tool)
						}
					}
				},
			}
		},
	})
}

export function getOpenCodeTools(): Map<string, OpenCodeToolDefinition> {
	return openCodeToolRegistry
}

const openCodeToolRegistry = new Map<string, OpenCodeToolDefinition>()

export { OPENCODE_PLUGIN_ID }
