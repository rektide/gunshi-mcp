import { plugin } from "gunshi/plugin"
import type { z } from "zod"
import type {
	AnalyzeOptions,
	SchemaAnalysis,
	SchemaPluginOptions,
	TypeHandler,
	ZodFieldInfo,
	FlattenedField,
	FlattenOptions,
	SchemaWarning,
	SchemaError,
} from "./types.ts"
import { introspectSchema } from "./introspect/field.ts"
import { flattenSchemaWithContext } from "./flatten/flatten.ts"
import { checkCollisions, formatCollisions } from "./flatten/collision.ts"
import { validateRequiredFields } from "./validate/required.ts"
import { schemaCache } from "./cache.ts"
import { SCHEMA_PLUGIN_ID } from "./types.ts"

export function createSchemaPlugin(options: SchemaPluginOptions = {}) {
	const { typeHandlers = {}, cache = true } = options
	const customHandlers = new Map<string, TypeHandler>(Object.entries(typeHandlers))

	return plugin({
		id: SCHEMA_PLUGIN_ID,
		name: "Schema Plugin",
		extension: () => {
			return {
				introspect<T extends z.ZodRawShape>(schema: z.ZodObject<T>): ZodFieldInfo[] {
					return introspectSchema(schema)
				},

				flatten<T extends z.ZodRawShape>(
					schema: z.ZodObject<T>,
					options?: FlattenOptions,
				): FlattenedField[] {
					const context = flattenSchemaWithContext(schema, options)
					return context.fields
				},

				analyze<T extends z.ZodRawShape>(
					schema: z.ZodObject<T>,
					options: AnalyzeOptions = {},
				): SchemaAnalysis {
					if (cache) {
						const cached = schemaCache.get(schema)
						if (cached) {
							return cached
						}
					}

					const { strict = false } = options
					const context = flattenSchemaWithContext(schema, options)
					const warnings: SchemaWarning[] = []
					const errors: SchemaError[] = []

					if (context.collisions.size > 0) {
						const warning: SchemaWarning = {
							code: "collision",
							message: `Collision detected:\n${formatCollisions(context.collisions)}`,
							path: "root",
						}
						warnings.push(warning)

						if (strict) {
							checkCollisions(context.collisions)
						}
					}

					const validation = validateRequiredFields(context.fields)
					const fields = introspectSchema(schema)

					const analysis: SchemaAnalysis = {
						fields,
						flattened: context.fields,
						required: validation.required,
						hasNested: context.hasNested,
						maxDepth: context.maxDepth,
						collisions: context.collisions,
						isValid: errors.length === 0,
						warnings,
						errors,
					}

					if (cache) {
						schemaCache.set(schema, analysis)
					}

					return analysis
				},

				registerTypeHandler(typeName: string, handler: TypeHandler): void {
					customHandlers.set(typeName, handler)
				},
			}
		},
	})
}

export { SCHEMA_PLUGIN_ID }
