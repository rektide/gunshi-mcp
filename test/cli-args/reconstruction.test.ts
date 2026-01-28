import { describe, it, expect } from "vitest"
import { reconstructNestedValues } from "../../src/zod-to-gunshi.js"

describe("reconstructNestedValues", () => {
	it("should reconstruct nested values from flat keys", () => {
		const flat = { "config-timeout": 30, "config-retries": 3, name: "test" }
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			config: { timeout: 30, retries: 3 },
			name: "test",
		})
	})

	it("should handle deeply nested values", () => {
		const flat = { "a-b-c": 42, "a-b-d": "hello", x: true }
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({
			a: { b: { c: 42, d: "hello" } },
			x: true,
		})
	})

	it("should handle custom separator", () => {
		const flat = { "config.timeout": 30, "config.retries": 3 }
		const nested = reconstructNestedValues(flat, ".")

		expect(nested).toEqual({
			config: { timeout: 30, retries: 3 },
		})
	})

	it("should handle flat-only values", () => {
		const flat = { name: "test", count: 5 }
		const nested = reconstructNestedValues(flat, "-")

		expect(nested).toEqual({ name: "test", count: 5 })
	})
})
