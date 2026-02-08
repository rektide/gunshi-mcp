import type { GunshiTool, ZodShape } from "../types.ts"
import type { ArgSchema } from "gunshi"
import type { GenerateCommandContext } from "./types.ts"
import { buildGunshiArg, type ZodFieldInfo } from "./schema/to-gunshi-arg.ts"
import { analyzeArray } from "./schema/arrays.ts"
import { applyOverrides } from "./schema/overrides.ts"

export interface CommandGeneratorOptions {
	prefix?: string
	separator?: string
	formatFlag?: boolean
	arrayHandling?: "json" | "repeated"
}

export function generateCommands(context: GenerateCommandContext): string[] {
	const { extensions, options, addCommand } = context
	const { separator = "-", formatFlag = false, prefix = "" } = options

	const tools = extensions.registry.list()
	const commandNames: string[] = []

	for (const tool of tools) {
		const commandName = prefix ? `${prefix}:${tool.name}` : tool.name
		const flattened = extensions.schema.flatten(tool.inputSchema as { shape: unknown }, {
			separator,
			maxDepth: 3,
		})

		const args: Record<string, ArgSchema> = {}

		for (const field of flattened) {
			const { key, info, optional } = field
			const override = tool.cli?.[key]
			const arrayHandler = analyzeArray(info.type, info.type === "object", {
				arrayHandling: options.arrayHandling,
			})

			let parseFunction: ((value: string) => unknown) | undefined

			if (info.type === "array" && field) {
				if (!override?.parse) {
					parseFunction = arrayHandler.parse
				}
			} else if (info.type === "object" && !override?.parse) {
				parseFunction = (v: string) => JSON.parse(v)
			}

			args[key] = buildGunshiArg({
				info: info as ZodFieldInfo,
				override,
				parseFunction,
				isOptional: optional,
			})
		}

		const argsWithOverrides = applyOverrides(args, tool.cli)

		addCommand(commandName, {
			args: argsWithOverrides as Record<string, ArgSchema>,
			handler: createToolHandler(tool),
		})

		commandNames.push(commandName)
	}

	if (formatFlag) {
		for (const tool of tools) {
			const commandName = prefix ? `${prefix}:${tool.name}` : tool.name
			addCommand(`${commandName}:format`, {
				args: {
					format: {
						type: "string" as const,
						description: "Output format (json, text, etc.)",
						default: "json",
					},
				},
				handler: () => {},
			})
		}
	}

	return commandNames
}

function createToolHandler<T extends ZodShape>(
	tool: GunshiTool<T>,
): (ctx: unknown, ...args: unknown[]) => Promise<unknown> {
	return async (ctx: unknown, ...args: unknown[]) => {
		const argValues = args[0] as Record<string, unknown>
		return tool.handler(argValues as any, ctx as any)
	}
}
