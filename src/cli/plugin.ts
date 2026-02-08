import { plugin } from "gunshi/plugin"
import type { CliPluginOptions, CliExtension, GenerateCommandContext } from "./types.ts"
import { generateCommands } from "./commands.ts"
import { CLI_PLUGIN_ID } from "./types.ts"
import { REGISTRY_PLUGIN_ID } from "../registry/types.ts"
import { SCHEMA_PLUGIN_ID } from "../schema/types.ts"
import type { RegistryExtension } from "../registry/types.ts"
import type { SchemaExtension } from "../schema/types.ts"
import type { PluginContext } from "gunshi"

type Deps = {
	[SCHEMA_PLUGIN_ID]?: SchemaExtension
	[REGISTRY_PLUGIN_ID]?: RegistryExtension
}

const deps = [SCHEMA_PLUGIN_ID, REGISTRY_PLUGIN_ID] as const

export function createCliPlugin(options: CliPluginOptions = {}) {
	let registeredCommands: string[] = []
	let extensionsRef: GenerateCommandContext["extensions"] | null = null
	let pluginCtxRef: PluginContext | null = null

	return plugin<Deps, typeof CLI_PLUGIN_ID, typeof deps, CliExtension>({
		id: CLI_PLUGIN_ID,
		name: "CLI Plugin",
		dependencies: deps,
		setup: (ctx) => {
			pluginCtxRef = ctx
		},
		extension: () => {
			const extension: CliExtension = {
				get commands() {
					return registeredCommands as readonly string[]
				},
				refresh() {
					if (pluginCtxRef && extensionsRef) {
						registeredCommands = generateCommands({
							tool: null as any,
							extensions: extensionsRef,
							options,
							addCommand: pluginCtxRef.addCommand.bind(pluginCtxRef),
						})
					}
				},
			}

			return extension
		},
		onExtension: (cmdCtx) => {
			const schemaExt = cmdCtx.extensions[SCHEMA_PLUGIN_ID]
			const registryExt = cmdCtx.extensions[REGISTRY_PLUGIN_ID]

			if (schemaExt && registryExt && pluginCtxRef) {
				extensionsRef = {
					schema: schemaExt as any,
					registry: registryExt as any,
				}

				registeredCommands = generateCommands({
					tool: null as any,
					extensions: extensionsRef,
					options,
					addCommand: pluginCtxRef.addCommand.bind(pluginCtxRef),
				})
			}
		},
	})
}

export { CLI_PLUGIN_ID }
