import { describe, it, expect } from "vitest"
import { z } from "zod"
import {
	introspectZodField,
	isZodObject,
	unwrapZodWrappers,
	getZodObjectShape,
	introspectSchema,
} from "../../src/schema/introspect/field.ts"

describe("Schema Introspect", () => {
	describe("introspectZodField", () => {
		it("should introspect string field", () => {
			const schema = z.string()
			const info = introspectZodField(schema)

			expect(info.type).toBe("string")
			expect(info.required).toBe(true)
			expect(info.description).toBeUndefined()
		})

		it("should introspect number field", () => {
			const schema = z.number()
			const info = introspectZodField(schema)

			expect(info.type).toBe("number")
			expect(info.required).toBe(true)
		})

		it("should introspect boolean field", () => {
			const schema = z.boolean()
			const info = introspectZodField(schema)

			expect(info.type).toBe("boolean")
			expect(info.required).toBe(true)
		})

		it("should introspect array field", () => {
			const schema = z.array(z.string())
			const info = introspectZodField(schema)

			expect(info.type).toBe("array")
			expect(info.required).toBe(true)
		})

		it("should introspect object field", () => {
			const schema = z.object({ name: z.string() })
			const info = introspectZodField(schema)

			expect(info.type).toBe("object")
			expect(info.required).toBe(true)
		})

		it("should introspect enum field", () => {
			const schema = z.enum(["a", "b", "c"])
			const info = introspectZodField(schema)

			expect(info.type).toBe("enum")
			expect(info.enumValues).toEqual(["a", "b", "c"])
		})

		it("should extract description from schema", () => {
			const schema = z.string().describe("A test description")
			const info = introspectZodField(schema)

			expect(info.description).toBe("A test description")
		})

		it("should extract description from wrapped schema", () => {
			const schema = z.string().describe("Test").optional()
			const info = introspectZodField(schema)

			expect(info.description).toBe("Test")
		})
	})

	describe("Wrapper Combinations", () => {
		describe("optional wrapper", () => {
			it("should handle optional string", () => {
				const schema = z.string().optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})

			it("should handle optional number", () => {
				const schema = z.number().optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("number")
				expect(info.required).toBe(false)
			})

			it("should handle optional array", () => {
				const schema = z.array(z.string()).optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("array")
				expect(info.required).toBe(false)
			})

			it("should handle optional object", () => {
				const schema = z.object({ name: z.string() }).optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("object")
				expect(info.required).toBe(false)
			})
		})

		describe("default wrapper", () => {
			it("should handle default string", () => {
				const schema = z.string().default("default")
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
				expect(info.default).toBe("default")
			})

			it("should handle default number", () => {
				const schema = z.number().default(42)
				const info = introspectZodField(schema)

				expect(info.type).toBe("number")
				expect(info.required).toBe(false)
				expect(info.default).toBe(42)
			})

			it("should handle default boolean", () => {
				const schema = z.boolean().default(true)
				const info = introspectZodField(schema)

				expect(info.type).toBe("boolean")
				expect(info.required).toBe(false)
				expect(info.default).toBe(true)
			})

			it("should handle default array", () => {
				const schema = z.array(z.string()).default([])
				const info = introspectZodField(schema)

				expect(info.type).toBe("array")
				expect(info.required).toBe(false)
				expect(info.default).toEqual([])
			})
		})

		describe("nullable wrapper", () => {
			it("should handle nullable string", () => {
				const schema = z.string().nullable()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})

			it("should handle nullable number", () => {
				const schema = z.number().nullable()
				const info = introspectZodField(schema)

				expect(info.type).toBe("number")
				expect(info.required).toBe(false)
			})
		})

		describe("catch wrapper", () => {
			it("should handle catch wrapper", () => {
				const schema = z.string().catch("fallback")
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})
		})

		describe("combined wrappers", () => {
			it("should handle optional().default().nullable() chain", () => {
				const schema = z.string().optional().default("default").nullable()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
				expect(info.default).toBe("default")
			})

			it("should handle default().optional().nullable() chain", () => {
				const schema = z.string().default("default").optional().nullable()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
				expect(info.default).toBe("default")
			})

			it("should handle nullable().optional().default() chain", () => {
				const schema = z.string().nullable().optional().default("default")
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
				expect(info.default).toBe("default")
			})

			it("should handle catch().optional() chain", () => {
				const schema = z.string().catch("fallback").optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})

			it("should handle wrappers on nested objects", () => {
				const schema = z
					.object({
						timeout: z.number(),
					})
					.optional()
					.default({ timeout: 30 })
					.nullable()
				const info = introspectZodField(schema)

				expect(info.type).toBe("object")
				expect(info.required).toBe(false)
				expect(info.default).toEqual({ timeout: 30 })
			})
		})

		describe("wrappers with transformations", () => {
			it("should handle transform combined with optional", () => {
				const schema = z.string().transform((val) => val.toUpperCase()).optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})
		})

		describe("wrappers with refinements", () => {
			it("should handle min() combined with optional", () => {
				const schema = z.string().min(5).optional()
				const info = introspectZodField(schema)

				expect(info.type).toBe("string")
				expect(info.required).toBe(false)
			})
		})
	})

	describe("isZodObject", () => {
		it("should return true for Zod object", () => {
			const schema = z.object({ name: z.string() })
			expect(isZodObject(schema)).toBe(true)
		})

		it("should return false for non-object", () => {
			const schema = z.string()
			expect(isZodObject(schema)).toBe(false)
		})

		it("should return false for null", () => {
			expect(isZodObject(null)).toBe(false)
		})
	})

	describe("unwrapZodWrappers", () => {
		it("should unwrap optional wrapper", () => {
			const schema = z.string().optional()
			const unwrapped = unwrapZodWrappers(schema)
			expect((unwrapped as any).type).toBe("string")
		})

		it("should unwrap default wrapper", () => {
			const schema = z.string().default("default")
			const unwrapped = unwrapZodWrappers(schema)
			expect((unwrapped as any).type).toBe("string")
		})

		it("should unwrap nullable wrapper", () => {
			const schema = z.string().nullable()
			const unwrapped = unwrapZodWrappers(schema)
			expect((unwrapped as any).type).toBe("string")
		})

		it("should unwrap multiple wrappers", () => {
			const schema = z.string().optional().nullable()
			const unwrapped = unwrapZodWrappers(schema)
			expect((unwrapped as any).type).toBe("string")
		})

		it("should return original if no wrappers", () => {
			const schema = z.string()
			const unwrapped = unwrapZodWrappers(schema)
			expect(unwrapped).toBe(schema)
		})
	})

	describe("getZodObjectShape", () => {
		it("should return shape for unwrapped object", () => {
			const schema = z.object({ name: z.string() })
			const shape = getZodObjectShape(schema)
			expect(shape).toBeDefined()
			expect("name" in (shape as any)).toBe(true)
		})

		it("should unwrap and return shape", () => {
			const schema = z.object({ name: z.string() }).optional()
			const shape = getZodObjectShape(schema)
			expect(shape).toBeDefined()
			expect("name" in (shape as any)).toBe(true)
		})

		it("should return undefined for non-object", () => {
			const schema = z.string()
			const shape = getZodObjectShape(schema)
			expect(shape).toBeUndefined()
		})
	})

	describe("introspectSchema", () => {
		it("should introspect all fields in object", () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
				email: z.string().optional(),
			})

			const fields = introspectSchema(schema)

			expect(fields).toHaveLength(3)
			expect(fields[0].type).toBe("string")
			expect(fields[1].type).toBe("number")
			expect(fields[2].type).toBe("string")
			expect(fields[2].required).toBe(false)
		})

		it("should preserve field order", () => {
			const schema = z.object({
				first: z.string(),
				second: z.number(),
				third: z.boolean(),
			})

			const fields = introspectSchema(schema)

			expect(fields[0].type).toBe("string")
			expect(fields[1].type).toBe("number")
			expect(fields[2].type).toBe("boolean")
		})
	})
})
