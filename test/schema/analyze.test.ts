import { describe, it, expect } from "vitest"
import { z } from "zod"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"
import { validateRequiredFields } from "../../src/schema/validate/required.ts"
import { introspectSchema } from "../../src/schema/introspect/field.ts"

describe("Schema Analyze", () => {
	describe("analyze - basic schemas", () => {
		it("should analyze simple object schema", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			const fields = introspectSchema(schema)
			const context = flattenSchemaWithContext(schema)
			const validation = validateRequiredFields(context.fields)

			expect(fields).toHaveLength(2)
			expect(context.fields).toHaveLength(2)
			expect(context.hasNested).toBe(false)
			expect(validation.required).toHaveLength(2)
		})

		it("should identify required fields", () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			})

			const context = flattenSchemaWithContext(schema)
			const validation = validateRequiredFields(context.fields)

			expect(validation.required).toEqual(["required"])
		})

		it("should detect nested objects", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema)

			expect(context.hasNested).toBe(true)
			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("config-timeout")
		})
	})

	describe("analyze - collision detection", () => {
		it("should detect simple collision", () => {
			const schema = z.object({
				"foo-bar": z.string(),
				foo: z.object({
					bar: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("foo-bar")).toBe(true)
		})

		it("should detect three-way collisions", () => {
			const schema = z.object({
				"foo-bar-baz": z.string(),
				foo: z.object({
					"bar-baz": z.string(),
				}),
				"foo-bar": z.object({
					baz: z.string(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("foo-bar-baz")).toBe(true)
			expect(context.collisions.get("foo-bar-baz")).toHaveLength(3)
		})

		it("should detect collisions at different nesting depths", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.string(),
				}),
				"config-timeout": z.string(),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("config-timeout")).toBe(true)
		})

		it("should detect collisions with optional fields", () => {
			const schema = z.object({
				"foo-bar": z.string().optional(),
				foo: z.object({
					bar: z.string().optional(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})

		it("should detect collisions with default values", () => {
			const schema = z.object({
				"foo-bar": z.string().default("default"),
				foo: z.object({
					bar: z.string().default("default"),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
		})
	})

	describe("analyze - depth limiting", () => {
		it("should track maxDepth in context", () => {
			const schema = z.object({
				level1: z.object({
					level2: z.object({
						level3: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { maxDepth: 10 })

			expect(context.maxDepth).toBe(10)
		})
	})

	describe("analyze - separator options", () => {
		it("should use underscore separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_" })

			expect(context.fields[0].key).toBe("config_timeout")
		})

		it("should use dot separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "." })

			expect(context.fields[0].key).toBe("config.timeout")
		})

		it("should use multi-character separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "__" })

			expect(context.fields[0].key).toBe("config__timeout")
		})

		it("should handle empty string separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "" })

			expect(context.fields[0].key).toBe("configtimeout")
		})
	})

	describe("analyze - prefix options", () => {
		it("should add prefix to all flattened keys", () => {
			const schema = z.object({
				timeout: z.number(),
				retries: z.number(),
			})

			const context = flattenSchemaWithContext(schema, { prefix: "config" })

			expect(context.fields).toHaveLength(2)
			expect(context.fields[0].key).toBe("config-timeout")
			expect(context.fields[1].key).toBe("config-retries")
		})

		it("should combine prefix with separator", () => {
			const schema = z.object({
				timeout: z.number(),
			})

			const context = flattenSchemaWithContext(schema, { prefix: "app", separator: "_" })

			expect(context.fields[0].key).toBe("app_timeout")
		})
	})

	describe("analyze - complex schemas", () => {
		it("should handle deeply nested schemas with collisions", () => {
			const schema = z.object({
				app: z.object({
					config: z.object({
						timeout: z.number(),
					}),
				}),
				"app-config": z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBeGreaterThan(0)
			expect(context.collisions.has("app-config-timeout")).toBe(true)
		})

		it("should handle schema with all wrapper combinations", () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
				defaulted: z.string().default("default"),
				nullable: z.string().nullable(),
				combined: z.string().optional().default("combined").nullable(),
			})

			const fields = introspectSchema(schema)
			const context = flattenSchemaWithContext(schema)
			const validation = validateRequiredFields(context.fields)

			expect(fields).toHaveLength(5)
			expect(validation.required).toHaveLength(1)
			expect(validation.required[0]).toBe("required")
		})
	})
})
