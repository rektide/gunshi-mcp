import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs - Basic Types", () => {
	it("should handle basic types", () => {
		const schema = z.object({
			name: z.string(),
			age: z.number(),
			active: z.boolean(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.name.type).toBe("string")
		expect(args.age.type).toBe("number")
		expect(args.active.type).toBe("boolean")
	})
})
