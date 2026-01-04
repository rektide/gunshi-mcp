import { plugin } from "gunshi/plugin"
import type pino from "pino"

export interface LoggerExtension {
	info: (msg: string, ...args: unknown[]) => void
	warn: (msg: string, ...args: unknown[]) => void
	error: (msg: string, ...args: unknown[]) => void
	debug: (msg: string, ...args: unknown[]) => void
	trace: (msg: string, ...args: unknown[]) => void
	fatal: (msg: string, ...args: unknown[]) => void
	child: (bindings: Record<string, unknown>) => LoggerExtension
	setLevel: (level: string) => void
}

export interface LoggerOptions {
	name?: string
	level?: string
	format?: "json" | "pretty"
	stdioMode?: boolean
	destination?: NodeJS.WritableStream
}

export const LOGGING_PLUGIN_ID = "logging" as const
export type LoggingPluginId = typeof LOGGING_PLUGIN_ID

export interface LoggingContext {
	logger: LoggerExtension
}

export interface LoggingPluginOptions {
	global?: boolean
}

export default function createLoggingPlugin(
	options: LoggingPluginOptions = {},
): ReturnType<typeof plugin> {
	return plugin({
		id: LOGGING_PLUGIN_ID,
		name: "Logging Plugin",
		setup: (ctx) => {
			if (options.global !== false) {
				ctx.addGlobalOption("verbose", {
					type: "boolean",
					short: "v",
					description: "Enable verbose (debug) logging",
				})
				ctx.addGlobalOption("quiet", {
					type: "boolean",
					short: "q",
					description: "Suppress non-error output",
				})
				ctx.addGlobalOption("format", {
					type: "string",
					description: "Output format (json or pretty)",
				})
				ctx.addGlobalOption("log-stdio", {
					type: "boolean",
					description: "Force logger to use stderr (for stdio mode)",
				})
				ctx.addGlobalOption("silent", {
					type: "boolean",
					description: "Suppress all log output",
				})
			}
		},
		extension: async (ctx) => {
			const verbose = ctx.values.verbose as boolean | undefined
			const quiet = ctx.values.quiet as boolean | undefined
			const format = (ctx.values.format as "json" | "pretty" | undefined) ?? "json"
			const stdioMode = (ctx.values["log-stdio"] as boolean | undefined) ?? false
			const silent = (ctx.values.silent as boolean | undefined) ?? false

			let level: string
			if (silent) {
				level = "silent"
			} else if (quiet) {
				level = "error"
			} else if (verbose) {
				level = "debug"
			} else {
				level = "info"
			}

			const pinoOptions: pino.LoggerOptions = {
				level,
				name: "gunshi-mcp",
			}

			let destination: pino.DestinationStream
			const pinoMod = await import("pino")

			if (stdioMode) {
				destination = pinoMod.destination(2)
			} else if (format === "pretty") {
				try {
					const pinoPretty = await import("pino-pretty")
					destination = pinoPretty.default()
				} catch {
					destination = pinoMod.destination(1)
				}
			} else {
				destination = pinoMod.destination(1)
			}

			const baseLogger = (await import("pino")).default(pinoOptions, destination)

			const createExtension = (logger: pino.Logger): LoggerExtension => ({
				info: (msg: string, ...args: unknown[]) => {
					logger.info(args.length > 0 ? { msg, args } : { msg })
				},
				warn: (msg: string, ...args: unknown[]) => {
					logger.warn(args.length > 0 ? { msg, args } : { msg })
				},
				error: (msg: string, ...args: unknown[]) => {
					logger.error(args.length > 0 ? { msg, args } : { msg })
				},
				debug: (msg: string, ...args: unknown[]) => {
					logger.debug(args.length > 0 ? { msg, args } : { msg })
				},
				trace: (msg: string, ...args: unknown[]) => {
					logger.trace(args.length > 0 ? { msg, args } : { msg })
				},
				fatal: (msg: string, ...args: unknown[]) => {
					logger.fatal(args.length > 0 ? { msg, args } : { msg })
				},
				child: (bindings: Record<string, unknown>) => {
					const childLogger = logger.child(bindings)
					return createExtension(childLogger)
				},
				setLevel: (newLevel: string) => {
					logger.level = newLevel
				},
			})

			return createExtension(baseLogger)
		},
	})
}
