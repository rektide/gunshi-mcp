export * from "./src/mcp-plugin.ts"
export {
	ToolResult,
	ToolContext,
	GunshiTool,
	AnyGunshiTool,
	Tool,
	GunshiArg,
	MCP_NEW_PLUGIN_ID,
	McpExtension,
	type McpNewPluginId,
	McpToolExtra,
	type JsonSchema,
	type CliOptions,
} from "./src/types.ts"
export { defineTool } from "./src/define-tool.ts"
export { zodSchemaToGunshiArgs, reconstructNestedValues } from "./src/zod-to-gunshi.ts"
export { buildToolContext } from "./src/context.ts"
export { extractText, formatResult } from "./src/output.ts"
export {
	default as createLoggingPlugin,
	LOGGING_PLUGIN_ID,
	type LoggingPluginId,
} from "./src/plugins/logger.ts"
export type {
	LoggerExtension,
	LoggerOptions,
	LoggingContext,
	LoggingPluginOptions,
} from "./src/plugins/logger.ts"
export { createSchemaPlugin, SCHEMA_PLUGIN_ID } from "./src/schema/plugin.ts"
export type {
	SchemaExtension,
	SchemaPluginOptions,
	ZodFieldInfo,
	FlattenedField,
	SchemaAnalysis,
	FlattenOptions,
	AnalyzeOptions,
	SchemaWarning,
	SchemaError,
	TypeHandler,
} from "./src/schema/types.ts"
export { createRegistryPlugin, ToolRegistry, REGISTRY_PLUGIN_ID } from "./src/registry/plugin.ts"
export type {
	RegistryExtension,
	RegistryPluginOptions,
	RegistryPluginId,
} from "./src/registry/types.ts"
export { createDiscoveryPlugin, DISCOVERY_PLUGIN_ID } from "./src/discovery/plugin.ts"
export type {
	DiscoveryExtension,
	DiscoveryPluginOptions,
	DiscoveryPluginId,
} from "./src/discovery/plugin.ts"
export type {
	RootDiscovery,
	ToolDiscovery,
	GlobToolDiscoveryOptions,
} from "./src/discovery/types.ts"
export {
	discoverTools,
	discoverToolsStream,
	defaultRootDiscovery,
	explicitRoots,
	chainRoots,
	globToolDiscovery,
	extractTools,
	isGunshiTool,
} from "./src/discovery/discover.ts"
export { createServerPlugin, ManagedMcpServer, SERVER_PLUGIN_ID } from "./src/server/plugin.ts"
export type { ServerExtension, ServerPluginId, ServerPluginOptions } from "./src/server/plugin.ts"
export type { ServerOptions } from "./src/server/types.ts"
export { createCliPlugin, CLI_PLUGIN_ID } from "./src/cli/plugin.ts"
export type {
	CliExtension,
	CliPluginOptions,
	GenerateCommandContext,
} from "./src/cli/types.ts"
export type { CommandGeneratorOptions } from "./src/cli/commands.ts"
export type { ZodFieldInfo as CliZodFieldInfo, BuildGunshiArgOptions } from "./src/cli/schema/to-gunshi-arg.ts"
export { buildGunshiArg } from "./src/cli/schema/to-gunshi-arg.ts"
export type { ArrayHandlerInfo, ArrayHandlerContext } from "./src/cli/schema/arrays.ts"
export { analyzeArray } from "./src/cli/schema/arrays.ts"
export type { OverrideContext } from "./src/cli/schema/overrides.ts"
export { applyOverrides } from "./src/cli/schema/overrides.ts"
export { reconstructNested } from "./src/cli/values/reconstruct.ts"
export type { ParseContext } from "./src/cli/values/parse.ts"
export { parseValue } from "./src/cli/values/parse.ts"
