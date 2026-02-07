import type { z } from "zod"

export interface ZodFieldInfo {
	type: "string" | "number" | "boolean" | "array" | "object" | "enum"
	required: boolean
	default?: unknown
	description?: string
	enumValues?: string[]
}

export interface FlattenedField {
	key: string
	info: ZodFieldInfo
	depth: number
	dotPath: string
	optional: boolean
}

export interface SchemaAnalysis {
	fields: ZodFieldInfo[]
	flattened: FlattenedField[]
	required: string[]
	hasNested: boolean
	maxDepth: number
	collisions: Map<string, string[]>
	isValid: boolean
	warnings: SchemaWarning[]
	errors: SchemaError[]
}

export interface SchemaWarning {
	code: "collision" | "max-depth" | "unsupported-type"
	message: string
	path: string
}

export interface SchemaError {
	code: "invalid-schema" | "circular-dependency"
	message: string
	path: string
}

export interface FlattenOptions {
	separator?: string
	maxDepth?: number
	prefix?: string
}

export interface AnalyzeOptions extends FlattenOptions {
	strict?: boolean
}

export interface TypeHandler {
	(schema: unknown): ZodFieldInfo | null
}

export const SCHEMA_PLUGIN_ID = "gunshi-mcp:schema" as const

export interface SchemaExtension {
	introspect: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => ZodFieldInfo[]
	flatten: <T extends z.ZodRawShape>(
		schema: z.ZodObject<T>,
		options?: FlattenOptions,
	) => FlattenedField[]
	analyze: <T extends z.ZodRawShape>(
		schema: z.ZodObject<T>,
		options?: AnalyzeOptions,
	) => SchemaAnalysis
	registerTypeHandler: (typeName: string, handler: TypeHandler) => void
}
