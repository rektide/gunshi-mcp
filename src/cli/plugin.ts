import { plugin, lazy, define } from "gunshi"
import type { CliPluginOptions, CliExtension, GenerateCommandContext } from "./types.ts"
import { generateCommands } from "./commands.ts"
import { CLI_PLUGIN_ID } from "./types.ts"
import { REGISTRY_PLUGIN_ID } from "../registry/types.ts"
import { SCHEMA_PLUGIN_ID } from "../schema/types.ts"
import type { RegistryExtension } from "../registry/types.ts"
import type { SchemaExtension } from "../schema/types.ts"
import type { PluginContext, CommandRunner } from "gunshi"

type Deps = {
	[SCHEMA_PLUGIN_ID]?: SchemaExtension
	[REGISTRY_PLUGIN_ID]?: RegistryExtension
}

const deps = [SCHEMA_PLUGIN_ID, REGISTRY_PLUGIN_ID] as const

export function createCliPlugin(options: CliPluginOptions = {}) {
	let registeredCommands: string[] = []
	let extensionsRef: GenerateCommandContext["extensions"] | null = null
	let pluginCtxRef: PluginContext | null = null
	let pluginExtensions: Record<string, unknown> = {}

	return plugin<Deps, typeof CLI_PLUGIN_ID, typeof deps, CliExtension>({
		id: CLI_PLUGIN_ID,
		name: "CLI Plugin",
		dependencies: deps,
		setup: (ctx) => {
			pluginCtxRef = ctx
		},
		extension: (ctx) => {
			pluginExtensions = ctx.extensions as Record<string, unknown>

			const extension: CliExtension = {
				get commands() {
					return registeredCommands as readonly string[]
				},
				refresh() {
					if (pluginCtxRef && extensionsRef) {
						registeredCommands = generateCommands({
							extensions: extensionsRef,
							options,
							addCommand: pluginCtxRef.addCommand.bind(pluginCtxRef),
						})
					}
				},
			}

			return extension
		},
		onExtension: async (cmdCtx) => {
			const schemaExt = cmdCtx.extensions[SCHEMA_PLUGIN_ID]
			const registryExt = cmdCtx.extensions[REGISTRY_PLUGIN_ID]

			if (schemaExt && registryExt && pluginCtxRef) {
				extensionsRef = {
					schema: schemaExt as any,
					registry: registryExt as any,
				}

				if (options.lazy) {
					registeredCommands = await registerLazyCommands(pluginCtxRef, pluginExtensions)
				} else {
					registeredCommands = generateCommands({
						extensions: extensionsRef,
						options,
						addCommand: pluginCtxRef.addCommand.bind(pluginCtxRef),
					})
				}
			}
		},
	})
}

async function registerLazyCommands(
	ctx: PluginContext,
	extensions: Record<string, unknown>,
): Promise<string[]> {
	const { quickDiscoverToolManifests } = await import("../discovery/manifest.ts")
	const { createToolLoader } = await import("../discovery/manifest.ts")

	const commandNames: string[] = []
	const manifestGenerator = quickDiscoverToolManifests()

	for await (const manifest of manifestGenerator) {
		const loader = async (): Promise<CommandRunner> => {
			const loaderFn = createToolLoader(manifest)
			const tool = await loaderFn()
			const { buildToolContext } = await import("../context.ts")
			const { extractText } = await import("../output.ts")

			return async (cmdCtx) => {
				const args = cmdCtx.values as Record<string, unknown>
				const toolContext = buildToolContext(extensions)

				try {
					const result = await tool.handler(args as any, toolContext)
					const text = extractText(result)
					if (text) {
						console.log(text)
					}
				} catch (error) {
					console.error(`Error executing tool ${manifest.name}:`, error)
					throw error
				}
			}
		}

		const minimalMeta = define({
			name: manifest.name,
			description: manifest.description,
		})

		const lazyCmd = lazy(loader, minimalMeta)
		ctx.addCommand(lazyCmd.commandName, lazyCmd)
		commandNames.push(lazyCmd.commandName)
	}

	return commandNames
}

export { CLI_PLUGIN_ID }
