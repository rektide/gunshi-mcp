import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodSchemaToGunshiArgs } from "../../src/zod-to-gunshi.js"

describe("zodSchemaToGunshiArgs - Documentation Generation", () => {
	it("should include Zod description in GunshiArg", () => {
		const schema = z.object({
			timeout: z.number().describe("Connection timeout in seconds"),
			retries: z.number().describe("Number of retry attempts"),
			name: z.string().describe("Service name"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.timeout.description).toBe("Connection timeout in seconds")
		expect(args.retries.description).toBe("Number of retry attempts")
		expect(args.name.description).toBe("Service name")
	})

	it("should include description for nested fields", () => {
		const schema = z.object({
			config: z.object({
				timeout: z.number().describe("Timeout value"),
				retries: z.number().describe("Retry count"),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["config-timeout"].description).toBe("Timeout value")
		expect(args["config-retries"].description).toBe("Retry count")
	})

	it("should use default value as example when description is missing", () => {
		const schema = z.object({
			timeout: z.number().default(30),
			enabled: z.boolean().default(true),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.timeout.default).toBe(30)
		expect(args.enabled.default).toBe(true)
	})

	it("should preserve description when default value is present", () => {
		const schema = z.object({
			timeout: z.number().describe("Timeout in seconds").default(30),
			name: z.string().describe("Service name").default("default-service"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.timeout.description).toBe("Timeout in seconds")
		expect(args.timeout.default).toBe(30)
		expect(args.name.description).toBe("Service name")
		expect(args.name.default).toBe("default-service")
	})

	it.skip("should include enum values in documentation", () => {
		const schema = z.object({
			logLevel: z.enum(["debug", "info", "warn", "error"]).describe("Logging level"),
			format: z.enum(["json", "yaml", "xml"]).describe("Output format"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.logLevel.choices).toEqual(["debug", "info", "warn", "error"])
		expect(args.format.choices).toEqual(["json", "yaml", "xml"])
	})

	it("should include description for enum fields", () => {
		const schema = z.object({
			logLevel: z.enum(["debug", "info", "warn"]).describe("Set logging verbosity"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.logLevel.description).toBe("Set logging verbosity")
	})

	it("should use enum default value as example", () => {
		const schema = z.object({
			logLevel: z.enum(["debug", "info", "warn"]).default("info"),
			format: z.enum(["json", "yaml"]).default("json"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.logLevel.default).toBe("info")
		expect(args.format.default).toBe("json")
	})

	it("should handle missing descriptions gracefully", () => {
		const schema = z.object({
			value1: z.string(),
			value2: z.number(),
			value3: z.boolean(),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.value1.description).toBeUndefined()
		expect(args.value2.description).toBeUndefined()
		expect(args.value3.description).toBeUndefined()
	})

	it("should include descriptions for optional fields", () => {
		const schema = z.object({
			optionalTimeout: z.number().optional().describe("Optional timeout"),
			optionalName: z.string().optional().describe("Optional name"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.optionalTimeout.description).toBe("Optional timeout")
		expect(args.optionalTimeout.required).toBeUndefined()
		expect(args.optionalName.description).toBe("Optional name")
		expect(args.optionalName.required).toBeUndefined()
	})

	it("should include descriptions for fields with default values", () => {
		const schema = z.object({
			timeout: z.number().default(30).describe("Connection timeout"),
			retries: z.number().default(3).describe("Retry attempts"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.timeout.description).toBe("Connection timeout")
		expect(args.timeout.default).toBe(30)
		expect(args.timeout.required).toBeUndefined()
		expect(args.retries.description).toBe("Retry attempts")
		expect(args.retries.default).toBe(3)
		expect(args.retries.required).toBeUndefined()
	})

	it.skip("should include descriptions for array fields", () => {
		const schema = z.object({
			items: z.array(z.string()).describe("List of items"),
			tags: z.array(z.string()).default([]).describe("Optional tags"),
		})

		const args = zodSchemaToGunshiArgs(schema)

		expect(args.items.description).toBe("List of items")
		expect(args.items.required).toBe(true)
		expect(args.tags.description).toBe("Optional tags")
		expect(args.tags.default).toEqual([])
		expect(args.tags.required).toBeUndefined()
	})

	it("should merge override descriptions with generated ones", () => {
		const schema = z.object({
			timeout: z.number().describe("Original description"),
			name: z.string(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			name: {
				description: "Custom description",
			},
		})

		// Override should replace generated description
		expect(args.timeout.description).toBe("Original description")
		expect(args.name.description).toBe("Custom description")
	})

	it("should add descriptions via overrides for fields without them", () => {
		const schema = z.object({
			value: z.number(),
			flag: z.boolean(),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			value: {
				description: "Custom value description",
			},
			flag: {
				description: "Custom flag description",
			},
		})

		expect(args.value.description).toBe("Custom value description")
		expect(args.flag.description).toBe("Custom flag description")
	})

	it.skip("should preserve enum values in overrides", () => {
		const schema = z.object({
			level: z.enum(["low", "medium", "high"]),
		})

		const args = zodSchemaToGunshiArgs(schema, {
			level: {
				description: "Severity level",
			},
		})

		expect(args.level.description).toBe("Severity level")
		expect(args.level.choices).toEqual(["low", "medium", "high"])
	})

	it("should include descriptions for complex nested structures", () => {
		const schema = z.object({
			database: z.object({
				host: z.string().describe("Database host"),
				port: z.number().describe("Database port"),
				credentials: z.object({
					username: z.string().describe("Database username"),
					password: z.string().describe("Database password"),
				}),
			}),
		})

		const args = zodSchemaToGunshiArgs(schema, {}, { separator: "-" })

		expect(args["database-host"].description).toBe("Database host")
		expect(args["database-port"].description).toBe("Database port")
		expect(args["database-credentials-username"].description).toBe("Database username")
		expect(args["database-credentials-password"].description).toBe("Database password")
	})
})
