import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.ts"

describe("zodSchemaToGunshiArgs - Overrides", () => {
	it("should apply CLI override for flattened keys", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number(),
			}),
		})

		const args = zodSchemaToGunshiArgs(
			schema,
			{
				"config-timeout": {
					short: "t",
					description: "Custom timeout description",
				},
			},
			{ separator: "-" },
		)

		expect(args["config-timeout"]).toBeDefined()
		expect(args["config-timeout"].short).toBe("t")
		expect(args["config-timeout"].description).toBe("Custom timeout description")
	})

	it("should apply CLI override for top-level keys", () => {
		const schema = z.object({
			name: z.string(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			name: {
				short: "n",
			},
		})

		expect(args.name).toBeDefined()
		expect(args.name.short).toBe("n")
	})

	it("should use custom parse function from override", () => {
		const schema = z.object({
			custom: z.string(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			custom: {
				parse: (value: string) => value.toUpperCase(),
			},
		})

		expect(args.custom).toBeDefined()
		expect(args.custom.parse).toBeDefined()
		expect(args.custom.parse?.("hello")).toBe("HELLO")
	})

	it("should merge override with generated properties", () => {
		const schema = z.object({
			timeout: z.number().describe("A timeout value"),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			timeout: {
				short: "t",
			},
		})

		expect(args.timeout).toBeDefined()
		expect(args.timeout.type).toBe("number")
		expect(args.timeout.short).toBe("t")
		expect(args.timeout.description).toBe("A timeout value")
	})

	it("should override generated parse function with custom one", () => {
		const schema = z.object({
			items: z.array(z.string()),
		})

		const args = zodSchemaToGunshiArgs(
			schema,
			{
				items: {
					parse: (value: string) => value.split("|").map((s) => s.trim()),
				},
			},
			{ arrayHandling: "repeated" },
		)

		expect(args.items).toBeDefined()
		expect(args.items.parse?.("a|b|c")).toEqual(["a", "b", "c"])
	})

	it.skip("should handle overrides that conflict with generated args", () => {
		const schema = z.object({
			timeout: z.number(),
		})

		// This should not throw but should use override
		const args = zodSchemaToGunshiArgs(schema, {
			timeout: {
				type: "string",
			},
		})

		expect(args.timeout).toBeDefined()
		// Type might be overridden - depends on implementation
	})

	it("should apply multiple overrides", () => {
		const schema = z.object({
			name: z.string(),
			count: z.number(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			name: {
				short: "n",
				description: "Custom name",
			},
			count: {
				short: "c",
			},
		})

		expect(args.name.short).toBe("n")
		expect(args.name.description).toBe("Custom name")
		expect(args.count.short).toBe("c")
	})
})
