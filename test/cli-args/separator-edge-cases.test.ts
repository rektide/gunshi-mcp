import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs - Separator Edge Cases", () => {
	it("should handle underscore separator", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number(),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "_" })

		expect(args["config_timeout"]).toBeDefined()
		expect(args["config_timeout"].type).toBe("number")
	})

	it("should handle dot separator", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number(),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "." })

		expect(args["config.timeout"]).toBeDefined()
		expect(args["config.timeout"].type).toBe("number")
	})

	it("should handle empty string separator", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number(),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "" })

		// With empty separator, keys get concatenated
		expect(args["configtimeout"]).toBeDefined()
		expect(args["configtimeout"].type).toBe("number")
	})

	it("should handle separator appearing in original field names", () => {
		const schema = z.object({
			"config-timeout": z.number(),
			config: z.object({
				timeout: z.number(),
			}),
		})

		// This should cause a collision since "config-timeout" appears both as a literal key
		// and as a flattened path
		expect(() => zodSchemaToGunshiArgs(schema, {}, { separator: "-" })).toThrow(/collisions/i)
	})

	it("should handle multi-character separator", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number(),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "__" })

		expect(args["config__timeout"]).toBeDefined()
		expect(args["config__timeout"].type).toBe("number")
	})
})
