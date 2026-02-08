import { describe, it, expect } from "vitest"
import { z } from "zod"
import { flattenSchemaWithContext } from "../../src/schema/flatten/flatten.ts"

describe("CLI - Separator Edge Cases", () => {
	describe("underscore separator", () => {
		it("should handle underscore separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("config_timeout")
			expect(context.fields[0].info.type).toBe("number")
		})

		it("should handle multiple levels with underscore", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("a_b_c")
		})
	})

	describe("dot separator", () => {
		it("should handle dot separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "." })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("config.timeout")
			expect(context.fields[0].info.type).toBe("number")
		})

		it("should handle multiple levels with dot", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "." })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("a.b.c")
		})
	})

	describe("empty string separator", () => {
		it("should handle empty string separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("configtimeout")
			expect(context.fields[0].info.type).toBe("number")
		})

		it("should concatenate multiple levels with empty separator", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("abc")
		})
	})

	describe("multi-character separator", () => {
		it("should handle multi-character separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "__" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("config__timeout")
		})

		it("should handle multiple levels with multi-character separator", () => {
			const schema = z.object({
				a: z.object({
					b: z.object({
						c: z.string(),
					}),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "__" })

			expect(context.fields).toHaveLength(1)
			expect(context.fields[0].key).toBe("a__b__c")
		})
	})

	describe("separator appearing in field names", () => {
		it("should detect collision when separator appears in field names", () => {
			const schema = z.object({
				"config-timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "-" })

			expect(context.collisions.size).toBe(1)
			expect(context.collisions.has("config-timeout")).toBe(true)
		})

		it("should not cause collision with different separator", () => {
			const schema = z.object({
				"config-timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_" })

			expect(context.collisions.size).toBe(0)
			expect(context.fields.find((f) => f.key === "config_timeout")).toBeDefined()
		})

		it("should handle dot separator with field names containing dots", () => {
			const schema = z.object({
				"config.timeout": z.number(),
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "." })

			expect(context.collisions.size).toBe(1)
		})
	})

	describe("separator with special characters", () => {
		it("should handle colon separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: ":" })

			expect(context.fields[0].key).toBe("config:timeout")
		})

		it("should handle slash separator", () => {
			const schema = z.object({
				config: z.object({
					timeout: z.number(),
				}),
			})

			const context = flattenSchemaWithContext(schema, { separator: "/" })

			expect(context.fields[0].key).toBe("config/timeout")
		})
	})

	describe("separator with prefix", () => {
		it("should combine prefix with different separator", () => {
			const schema = z.object({
				timeout: z.number(),
			})

			const context = flattenSchemaWithContext(schema, { separator: "_", prefix: "config" })

			expect(context.fields[0].key).toBe("config_timeout")
		})
	})
})
