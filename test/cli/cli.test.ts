import { describe, it, expect } from "vitest"
import {
	createCliPlugin,
	buildGunshiArg,
	analyzeArray,
	applyOverrides,
	reconstructNested,
} from "../../src/cli/index.ts"

describe("CLI Plugin", () => {
	describe("buildGunshiArg", () => {
		it("should build a basic string arg", () => {
			const result = buildGunshiArg({
				info: {
					type: "string",
					required: true,
					description: "Test description",
				},
			})
			expect(result.type).toBe("string")
			expect(result.required).toBe(true)
			expect(result.description).toBe("Test description")
		})

		it("should build a number arg", () => {
			const result = buildGunshiArg({
				info: {
					type: "number",
					required: false,
					default: 42,
				},
			})
			expect(result.type).toBe("number")
			expect(result.required).toBe(undefined)
			expect(result.default).toBe(42)
		})

		it("should build a boolean arg", () => {
			const result = buildGunshiArg({
				info: {
					type: "boolean",
					required: false,
					default: false,
				},
			})
			expect(result.type).toBe("boolean")
			expect(result.default).toBe(false)
		})

		it("should handle enum types as strings", () => {
			const result = buildGunshiArg({
				info: {
					type: "enum",
					required: true,
					enumValues: ["a", "b", "c"],
				},
			})
			expect(result.type).toBe("string")
		})

		it("should handle arrays with custom parse", () => {
			const result = buildGunshiArg({
				info: {
					type: "array",
					required: false,
				},
				parseFunction: (v: string) => JSON.parse(v),
			})
			expect(result.type).toBe("custom")
			expect(result.parse).toBeDefined()
		})

		it("should apply override properties", () => {
			const result = buildGunshiArg({
				info: {
					type: "string",
					required: true,
				},
				override: {
					short: "t",
					description: "Override description",
				},
			})
			expect(result.short).toBe("t")
			expect(result.description).toBe("Override description")
		})

		it("should respect isOptional", () => {
			const requiredResult = buildGunshiArg({
				info: {
					type: "string",
					required: true,
				},
				isOptional: false,
			})
			expect(requiredResult.required).toBe(true)

			const optionalResult = buildGunshiArg({
				info: {
					type: "string",
					required: true,
				},
				isOptional: true,
			})
			expect(optionalResult.required).toBe(undefined)
		})
	})

	describe("analyzeArray", () => {
		it("should handle non-array types with comma split", () => {
			const result = analyzeArray("string", false, {})
			expect(result.shouldUseRepeated).toBe(false)
			expect(result.parse("a,b,c")).toEqual(["a", "b", "c"])
		})

		it("should handle arrays with repeated handling", () => {
			const result = analyzeArray("array", false, { arrayHandling: "repeated" })
			expect(result.shouldUseRepeated).toBe(false)
			expect(result.parse("a,b,c")).toEqual(["a", "b", "c"])
		})

		it("should handle arrays with json handling", () => {
			const result = analyzeArray("array", false, { arrayHandling: "json" })
			expect(result.shouldUseRepeated).toBe(false)
			expect(result.parse('["a","b","c"]')).toEqual(["a", "b", "c"])
		})

		it("should handle object arrays with repeated handling", () => {
			const result = analyzeArray("array", true, { arrayHandling: "repeated" })
			expect(result.shouldUseRepeated).toBe(true)
			expect(result.parse('[{"a":1},{"b":2}]')).toEqual([{ a: 1 }, { b: 2 }])
		})

		it("should handle object arrays with json handling", () => {
			const result = analyzeArray("array", true, { arrayHandling: "json" })
			expect(result.shouldUseRepeated).toBe(false)
			expect(result.parse('[{"a":1}]')).toEqual([{ a: 1 }])
		})
	})

	describe("applyOverrides", () => {
		it("should return original args if no overrides", () => {
			const args: Record<string, { type: string; required?: boolean }> = {
				name: { type: "string", required: true },
				age: { type: "number" },
			}
			const result = applyOverrides(args)
			expect(result).toEqual(args)
		})

		it("should apply overrides to existing args", () => {
			const args: Record<
				string,
				{ type: string; required?: boolean; description?: string; short?: string }
			> = {
				name: { type: "string", required: true },
				age: { type: "number" },
			}
			const overrides = {
				name: { description: "Person name" },
				age: { short: "a" },
			}
			const result = applyOverrides(args, overrides)
			expect(result.name.description).toBe("Person name")
			expect(result.age.short).toBe("a")
		})

		it("should not add new args from overrides", () => {
			const args: Record<string, { type: "string"; required?: boolean }> = {
				name: { type: "string", required: true },
			}
			const overrides = {
				age: { type: "number" as const },
			}
			const result = applyOverrides(args, overrides)
			expect(Object.keys(result)).toEqual(["name"])
		})

		it("should handle empty overrides", () => {
			const args: Record<string, { type: string; required?: boolean }> = {
				name: { type: "string", required: true },
			}
			const result = applyOverrides(args, {})
			expect(result).toEqual(args)
		})
	})

	describe("reconstructNested", () => {
		it("should reconstruct flat keys to nested objects", () => {
			const flatValues = {
				name: "test",
				"config-timeout": 30,
				"config-retries": 3,
			}
			const result = reconstructNested(flatValues, "-")
			expect(result).toEqual({
				name: "test",
				config: {
					timeout: 30,
					retries: 3,
				},
			})
		})

		it("should handle single-level keys", () => {
			const flatValues = {
				name: "test",
				age: 30,
			}
			const result = reconstructNested(flatValues, "-")
			expect(result).toEqual({
				name: "test",
				age: 30,
			})
		})

		it("should handle deep nesting", () => {
			const flatValues = {
				"a-b-c": "deep",
				"x-y": "middle",
				z: "shallow",
			}
			const result = reconstructNested(flatValues, "-")
			expect(result).toEqual({
				a: {
					b: {
						c: "deep",
					},
				},
				x: {
					y: "middle",
				},
				z: "shallow",
			})
		})

		it("should handle empty object", () => {
			const result = reconstructNested({}, "-")
			expect(result).toEqual({})
		})

		it("should handle custom separator", () => {
			const flatValues = {
				"config.timeout": 30,
				"config.retries": 3,
			}
			const result = reconstructNested(flatValues, ".")
			expect(result).toEqual({
				config: {
					timeout: 30,
					retries: 3,
				},
			})
		})
	})

	describe("createCliPlugin", () => {
		it("should create a plugin with correct ID", () => {
			const plugin = createCliPlugin()
			expect(plugin.id).toBe("gunshi-mcp:cli")
		})

		it("should create a plugin with correct name", () => {
			const plugin = createCliPlugin()
			expect(plugin.name).toBe("CLI Plugin")
		})

		it("should accept options", () => {
			const options = {
				prefix: "tool",
				separator: ".",
				formatFlag: true,
			}
			const plugin = createCliPlugin(options)
			expect(plugin).toBeDefined()
		})
	})
})
