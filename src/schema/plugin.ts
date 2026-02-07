import type { Plugin } from "gunshi"
import type { z } from "zod"
import type {
	AnalyzeOptions,
	SchemaAnalysis,
	SchemaExtension,
	TypeHandler,
	ZodFieldInfo,
	FlattenedField,
	FlattenOptions,
	SchemaWarning,
	SchemaError,
} from "./types.js"
import {
	introspectSchema,
	isZodObject,
	getZodObjectShape,
	unwrapZodWrappers,
} from "./introspect/field.js"
import { flattenSchemaWithContext, checkCollisions, formatCollisions } from "./flatten/flatten.js"
import { validateRequiredFields } from "./validate/required.js"
import { getCachedAnalysis, setCachedAnalysis } from "./cache.js"
import { SCHEMA_PLUGIN_ID } from "./types.js"

export interface SchemaPluginOptions {
	typeHandlers?: Record<string, TypeHandler>
	cache?: boolean
}

export function createSchemaPlugin(options: SchemaPluginOptions = {}): Plugin {
	const { typeHandlers = {}, cache = true } = options
	const customHandlers = new Map<string, TypeHandler>(Object.entries(typeHandlers))

	return {
		id: SCHEMA_PLUGIN_ID,
		setup(ctx) {
			const extension: SchemaExtension = {
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
						const cached = getCachedAnalysis(schema)
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
						setCachedAnalysis(schema, analysis)
					}

					return analysis
				},

				registerTypeHandler(typeName: string, handler: TypeHandler): void {
					customHandlers.set(typeName, handler)
				},
			}

			ctx.setExtension(SCHEMA_PLUGIN_ID, extension)
		},
	}
}
