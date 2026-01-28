import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs - Wrappers", () => {
	it("should propagate optional from parent", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.optional(),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})

	it("should handle nullable wrapper", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.nullable(),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})

	it("should handle default wrapper", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.default({ timeout: 30 }),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})

	it("should handle catch wrapper", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.catch({ timeout: 30 }),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})

	it("should handle multiple nested wrappers", () => {
		const schema = z.object({
			config: z
				.object({
					timeout: z.number(),
				})
				.optional()
				.default({ timeout: 30 }),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].required).toBeUndefined()
	})
})
