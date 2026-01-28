export interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

/**
 * Options for converting Zod schemas to CLI arguments.
 * Shared between zodSchemaToGunshiArgs and ToolDefinition.cliOptions.
 */
export interface CliOptions {
	/** Separator for nested object keys. Default: "-" (e.g., --config-timeout) */
	separator?: string
	/** Maximum nesting depth before falling back to JSON string input. Default: 3 */
	maxDepth?: number
	/** How to handle array fields: "json" for JSON string, "repeated" for repeated flags. Default: "repeated" */
	arrayHandling?: "json" | "repeated"
}

/** @internal Options passed to flatten, includes prefix for recursion */
export interface FlattenOptions extends CliOptions {
	prefix?: string
}

export interface CollisionInfo {
	flag: string
	paths: string[]
}
