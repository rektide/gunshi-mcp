import { describe, it, expect } from "vitest"
import { z } from "zod"
import { zodToJsonSchema } from "../../src/zod-to-gunshi.js"

describe("zodToJsonSchema - Edge Cases", () => {
	it("should handle arrays of objects in JSON schema", () => {
		const schema = z.object({
			items: z.array(
				z.object({
					name: z.string(),
					value: z.number(),
				}),
			),
		})

		const jsonSchema = zodToJsonSchema(schema)

		expect(jsonSchema).toEqual({
			type: "object",
			properties: {
				items: {
					type: "array",
					items: { type: "object" },
				},
			},
			required: ["items"],
			additionalProperties: false,
		})
	})

	it("should handle enum arrays", () => {
		const schema = z.object({
			formats: z.array(z.enum(["json", "xml", "yaml"])),
		})

		const jsonSchema = zodToJsonSchema(schema)

		expect(jsonSchema).toEqual({
			type: "object",
			properties: {
				formats: {
					type: "array",
					items: { type: "string" },
				},
			},
			required: ["formats"],
			additionalProperties: false,
		})
	})

	it.skip("should handle deeply nested JSON schema structure", () => {
		const schema = z.object({
			config: z.object({
				database: z.object({
					connection: z.object({
						host: z.string(),
						port: z.number(),
						credentials: z.object({
							username: z.string(),
							password: z.string(),
						}),
					}),
				}),
			}),
		})

		const jsonSchema = zodToJsonSchema(schema)

		expect(jsonSchema).toEqual({
			type: "object",
			properties: {
				config: {
					type: "object",
					properties: {
						database: {
							type: "object",
							properties: {
								connection: {
									type: "object",
									properties: {
										host: { type: "string" },
										port: { type: "number" },
										credentials: {
											type: "object",
											properties: {
												username: { type: "string" },
												password: { type: "string" },
											},
											required: ["username", "password"],
										},
									},
									required: ["host", "port", "credentials"],
								},
							},
							required: ["connection"],
						},
					},
					required: ["database"],
				},
			},
			required: ["config"],
			additionalProperties: false,
		})
	})

	it.skip("should handle nested arrays", () => {
		const schema = z.object({
			matrix: z.array(z.array(z.number())),
		})

		const jsonSchema = zodToJsonSchema(schema)

		expect(jsonSchema).toEqual({
			type: "object",
			properties: {
				matrix: {
					type: "array",
					items: { type: "array" },
				},
			},
			required: ["matrix"],
			additionalProperties: false,
		})
	})

	it.skip("should handle mixed nested structure with arrays and objects", () => {
		const schema = z.object({
			config: z.object({
				items: z.array(
					z.object({
						name: z.string(),
						tags: z.array(z.string()),
					}),
				),
			}),
		})

		const jsonSchema = zodToJsonSchema(schema)

		expect(jsonSchema).toEqual({
			type: "object",
			properties: {
				config: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: { type: "object" },
						},
					},
					required: ["items"],
				},
			},
			required: ["config"],
			additionalProperties: false,
		})
	})
})
