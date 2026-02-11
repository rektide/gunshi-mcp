import type { Plugin } from "gunshi"
import type { LoggingPluginOptions } from "./plugins/logger.ts"
import type { SchemaPluginOptions } from "./schema/types.ts"
import type { RegistryPluginOptions } from "./registry/types.ts"
import type { DiscoveryPluginOptions } from "./discovery/plugin.ts"
import type { ServerPluginOptions } from "./server/plugin.ts"
import type { CliPluginOptions } from "./cli/types.ts"
import type { OpenCodePluginOptions } from "./opencode/types.ts"

export interface BuilderConfig {
	logging?: LoggingPluginOptions | true
	schema?: SchemaPluginOptions | true
	registry?: RegistryPluginOptions | true
	discovery?: DiscoveryPluginOptions | true
	server?: ServerPluginOptions | true
	cli?: CliPluginOptions | true
	opencode?: OpenCodePluginOptions | true
	lazy?: boolean
}

export interface GunshiMcpBuilder {
	withLogging(options?: LoggingPluginOptions): GunshiMcpBuilder
	withSchema(options?: SchemaPluginOptions): GunshiMcpBuilder
	withRegistry(options?: RegistryPluginOptions): GunshiMcpBuilder
	withDiscovery(options?: DiscoveryPluginOptions): GunshiMcpBuilder
	withServer(options?: ServerPluginOptions): GunshiMcpBuilder
	withCli(options?: CliPluginOptions): GunshiMcpBuilder
	withOpenCode(options?: OpenCodePluginOptions): GunshiMcpBuilder
	withLazy(lazy?: boolean): GunshiMcpBuilder
	build(): Promise<Plugin[]>
}

function normalizeOptions<T>(value: T | true | undefined): T | undefined {
	if (value === true) return {} as T
	return value
}

class GunshiMcpBuilderImpl implements GunshiMcpBuilder {
	private config: BuilderConfig = {}

	withLogging(options?: LoggingPluginOptions): GunshiMcpBuilder {
		this.config.logging = options ?? true
		return this
	}

	withSchema(options?: SchemaPluginOptions): GunshiMcpBuilder {
		this.config.schema = options ?? true
		return this
	}

	withRegistry(options?: RegistryPluginOptions): GunshiMcpBuilder {
		this.config.registry = options ?? true
		return this
	}

	withDiscovery(options?: DiscoveryPluginOptions): GunshiMcpBuilder {
		this.config.discovery = options ?? true
		return this
	}

	withServer(options?: ServerPluginOptions): GunshiMcpBuilder {
		this.config.server = options ?? true
		return this
	}

	withCli(options?: CliPluginOptions): GunshiMcpBuilder {
		this.config.cli = options ?? true
		return this
	}

	withOpenCode(options?: OpenCodePluginOptions): GunshiMcpBuilder {
		this.config.opencode = options ?? true
		return this
	}

	withLazy(lazy: boolean = true): GunshiMcpBuilder {
		this.config.lazy = lazy
		return this
	}

	async build(): Promise<Plugin[]> {
		const plugins: Plugin[] = []
		const lazy = this.config.lazy ?? false

		if (this.config.logging) {
			const { default: createLoggingPlugin } = await import("./plugins/logger.ts")
			plugins.push(createLoggingPlugin(normalizeOptions(this.config.logging)))
		}

		if (this.config.discovery) {
			const { createDiscoveryPlugin } = await import("./discovery/plugin.ts")
			plugins.push(createDiscoveryPlugin(normalizeOptions(this.config.discovery)))
		}

		if (this.config.registry) {
			const { createRegistryPlugin } = await import("./registry/plugin.ts")
			plugins.push(createRegistryPlugin(normalizeOptions(this.config.registry)))
		}

		const needsSchema = this.config.cli || this.config.schema
		if (needsSchema) {
			const { createSchemaPlugin } = await import("./schema/plugin.ts")
			plugins.push(createSchemaPlugin(normalizeOptions(this.config.schema)))
		}

		if (this.config.server) {
			const { createServerPlugin } = await import("./server/plugin.ts")
			const serverOptions =
				typeof this.config.server === "boolean" ? { lazy } : { ...this.config.server, lazy }
			plugins.push(createServerPlugin(serverOptions))
		}

		if (this.config.cli) {
			const { createCliPlugin } = await import("./cli/plugin.ts")
			const cliOptions =
				typeof this.config.cli === "boolean" ? { lazy } : { ...this.config.cli, lazy }
			plugins.push(createCliPlugin(cliOptions))
		}

		if (this.config.opencode) {
			const { createOpenCodePlugin } = await import("./opencode/plugin.ts")
			plugins.push(createOpenCodePlugin(normalizeOptions(this.config.opencode)))
		}

		return plugins
	}
}

export function gunshiMcp(): GunshiMcpBuilder {
	return new GunshiMcpBuilderImpl()
}
