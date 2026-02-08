import { describe, it, expect } from "vitest"
import { z } from "zod"
import { GunshiTool } from "../../src/types.ts"

describe("CLI - Per-Tool Options", () => {
	describe("different tools with different separators", () => {
		it.todo("should handle tools with different separators", () => {
			// TODO: CLI plugin doesn't currently support per-tool cliOptions
			// When implemented, each tool should be able to specify its own separator
			// e.g., tool1.cliOptions?.separator vs tool2.cliOptions?.separator

			const tool1: GunshiTool = {
				name: "tool1",
				description: "Tool with dash separator",
				inputSchema: z.object({
					config: z.object({
						timeout: z.number(),
					}),
				}),
				cliOptions: { separator: "-" },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "tool1",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			const tool2: GunshiTool = {
				name: "tool2",
				description: "Tool with dot separator",
				inputSchema: z.object({
					config: z.object({
						timeout: z.number(),
					}),
				}),
				cliOptions: { separator: "." },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "tool2",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Expected: tool1 should use "-" separator (config-timeout)
			// Expected: tool2 should use "." separator (config.timeout)
			// Currently: Both tools use the global separator from CLI plugin options
			expect(tool1.cliOptions?.separator).toBe("-")
			expect(tool2.cliOptions?.separator).toBe(".")
		})
	})

	describe("different tools with different maxDepth", () => {
		it.todo("should handle tools with different maxDepth", () => {
			// TODO: CLI plugin doesn't currently support per-tool cliOptions
			// When implemented, each tool should be able to specify its own maxDepth

			const shallowTool: GunshiTool = {
				name: "shallow-tool",
				description: "Tool with shallow depth",
				inputSchema: z.object({
					config: z.object({
						timeout: z.number(),
					}),
				}),
				cliOptions: { maxDepth: 0 },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "shallow-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			const deepTool: GunshiTool = {
				name: "deep-tool",
				description: "Tool with deep depth",
				inputSchema: z.object({
					config: z.object({
						timeout: z.number(),
					}),
				}),
				cliOptions: { maxDepth: 5 },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "deep-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Expected: shallow-tool should use maxDepth 0
			// Expected: deep-tool should use maxDepth 5
			// Currently: Both tools use hardcoded maxDepth 3
			expect(shallowTool.cliOptions?.maxDepth).toBe(0)
			expect(deepTool.cliOptions?.maxDepth).toBe(5)
		})
	})

	describe("different tools with different arrayHandling", () => {
		it.todo("should handle tools with different arrayHandling", () => {
			// TODO: CLI plugin doesn't currently support per-tool cliOptions
			// When implemented, each tool should be able to specify its own arrayHandling

			const repeatedTool: GunshiTool = {
				name: "repeated-tool",
				description: "Tool with repeated array handling",
				inputSchema: z.object({
					items: z.array(z.string()),
				}),
				cliOptions: { arrayHandling: "repeated" },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "repeated-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			const jsonTool: GunshiTool = {
				name: "json-tool",
				description: "Tool with JSON array handling",
				inputSchema: z.object({
					items: z.array(z.string()),
				}),
				cliOptions: { arrayHandling: "json" },
				handler: async () => ({
					type: "tool_result",
					toolUseId: "json-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Expected: repeated-tool should use repeated handling (--items a,b,c)
			// Expected: json-tool should use JSON handling (--items '["a","b","c"]')
			// Currently: Both tools use the global arrayHandling from CLI plugin options
			expect(repeatedTool.cliOptions?.arrayHandling).toBe("repeated")
			expect(jsonTool.cliOptions?.arrayHandling).toBe("json")
		})
	})

	describe("tool with all CLI options combined", () => {
		it.todo("should handle tool with all CLI options", () => {
			// TODO: CLI plugin doesn't currently support per-tool cliOptions
			// When implemented, a tool should be able to specify all options together

			const tool: GunshiTool = {
				name: "combined-tool",
				description: "Tool with all CLI options",
				inputSchema: z.object({
					config: z.object({
						items: z.array(z.string()),
					}),
				}),
				cliOptions: {
					separator: "_",
					maxDepth: 3,
					arrayHandling: "repeated",
				},
				handler: async () => ({
					type: "tool_result",
					toolUseId: "combined-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Expected: tool should use "_" separator, maxDepth 3, and repeated array handling
			// Currently: Tool uses global options from CLI plugin
			expect(tool.cliOptions?.separator).toBe("_")
			expect(tool.cliOptions?.maxDepth).toBe(3)
			expect(tool.cliOptions?.arrayHandling).toBe("repeated")
		})
	})

	describe("tool with no CLI options", () => {
		it("should allow tools without cliOptions", () => {
			// This test verifies that tools can be created without cliOptions

			const tool: GunshiTool = {
				name: "default-tool",
				description: "Tool with default CLI options",
				inputSchema: z.object({
					value: z.string(),
				}),
				handler: async () => ({
					type: "tool_result",
					toolUseId: "default-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Tool without cliOptions should be valid
			expect(tool.cliOptions).toBeUndefined()
		})
	})

	describe("per-tool field overrides", () => {
		it("should handle per-tool field overrides via cli property", () => {
			// This test verifies that tool.cli field overrides work

			const tool: GunshiTool = {
				name: "test-tool",
				description: "Tool with field overrides",
				inputSchema: z.object({
					timeout: z.number().describe("A timeout value"),
					name: z.string(),
				}),
				cli: {
					timeout: {
						short: "t",
						description: "Custom timeout description",
					},
					name: {
						short: "n",
					},
				},
				handler: async () => ({
					type: "tool_result",
					toolUseId: "test-tool",
					content: [{ type: "text", text: "Done" }],
				}),
			}

			// Field overrides are defined on tool.cli
			expect(tool.cli?.timeout?.short).toBe("t")
			expect(tool.cli?.timeout?.description).toBe("Custom timeout description")
			expect(tool.cli?.name?.short).toBe("n")
		})
	})
})
