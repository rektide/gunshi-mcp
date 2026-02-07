import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.ts"

describe("zodSchemaToGunshiArgs - Wrapper Combinations", () => {
	it("should handle optional().default().nullable() chain", () => {
		const schema = z.object({
			value: z.string().optional().default("default").nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})

	it("should handle default().optional().nullable() chain", () => {
		const schema = z.object({
			value: z.string().default("default").optional().nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})

	it("should handle nullable().optional().default() chain", () => {
		const schema = z.object({
			value: z.string().nullable().optional().default("default"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})

	it("should handle wrappers on array fields", () => {
		const schema = z.object({
			items: z.array(z.string()).optional(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle default() on array fields", () => {
		const schema = z.object({
			items: z.array(z.string()).default([]),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle nullable() on array fields", () => {
		const schema = z.object({
			items: z.array(z.number()).nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle all three wrappers on array fields", () => {
		const schema = z.object({
			items: z.array(z.string()).optional().default([]).nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items).toBeDefined()
		expect(args.items.required).toBeUndefined()
	})

	it("should handle wrappers on nested objects", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.optional()
				.default({ timeout: 30 })
				.nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})

	it("should handle catch() combined with other wrappers", () => {
		const schema = z.object({
			value: z.string().catch("fallback").optional(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})

	it("should handle wrappers with transformations", () => {
		const schema = z.object({
			value: z
				.string()
				.transform((val) => val.toUpperCase())
				.optional(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})

	it("should handle refine() combined with wrappers", () => {
		const schema = z.object({
			value: z.string().min(5).optional(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value).toBeDefined()
		expect(args.value.required).toBeUndefined()
	})
})
