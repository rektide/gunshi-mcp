import { describe, it, expect } from "vitest"
import { z } from "zod"
import { isOpenCodeEnvironment } from "../../src/opencode/detection.ts"
import { convertToOpenCodeTool, filterTools } from "../../src/opencode/exposure.ts"
import {
	installOpenCodeTools,
	getInstalledTools,
	createOpenCodeToolExport,
} from "../../src/opencode/install.ts"
import type { GunshiTool } from "../../src/types.ts"

const createTestTool = (name: string, description?: string): GunshiTool => ({
	name,
	description,
	inputSchema: z.object({
		input: z.string().describe("Test input"),
	}),
	handler: async (args) => ({
		content: [{ type: "text" as const, text: `Handled: ${args.input}` }],
	}),
})

describe("OpenCode Plugin", () => {
	describe("isOpenCodeEnvironment", () => {
		it("should return true (placeholder implementation)", () => {
			expect(isOpenCodeEnvironment()).toBe(true)
		})
	})

	describe("filterTools", () => {
		const tools = [createTestTool("tool1"), createTestTool("tool2"), createTestTool("tool3")]

		it("should return all tools when no filters", () => {
			const result = filterTools(tools, {})
			expect(result).toHaveLength(3)
		})

		it("should exclude specified tools", () => {
			const result = filterTools(tools, { exclude: ["tool2"] })
			expect(result).toHaveLength(2)
			expect(result.map((t) => t.name)).toEqual(["tool1", "tool3"])
		})

		it("should include only specified tools", () => {
			const result = filterTools(tools, { include: ["tool1", "tool3"] })
			expect(result).toHaveLength(2)
			expect(result.map((t) => t.name)).toEqual(["tool1", "tool3"])
		})

		it("should prefer exclude over include", () => {
			const result = filterTools(tools, { include: ["tool1", "tool2"], exclude: ["tool2"] })
			expect(result).toHaveLength(1)
			expect(result[0].name).toBe("tool1")
		})
	})

	describe("convertToOpenCodeTool", () => {
		it("should convert GunshiTool to OpenCodeToolDefinition", () => {
			const tool = createTestTool("test-tool", "A test tool")
			const def = convertToOpenCodeTool(tool, {})

			expect(def.description).toBe("A test tool")
			expect(def.args).toHaveProperty("input")
			expect(typeof def.execute).toBe("function")
		})

		it("should handle empty description", () => {
			const tool = createTestTool("test-tool")
			const def = convertToOpenCodeTool(tool, {})

			expect(def.description).toBe("")
		})

		it("should execute handler and return text", async () => {
			const tool = createTestTool("test-tool")
			const def = convertToOpenCodeTool(tool, {})

			const context = {
				agent: "test-agent",
				sessionID: "session-123",
				messageID: "message-456",
				directory: "/test",
				worktree: "/test",
			}

			const result = await def.execute({ input: "hello" }, context)
			expect(result).toBe("Handled: hello")
		})
	})

	describe("installOpenCodeTools", () => {
		it("should install tools when in opencode environment", () => {
			const tools = [createTestTool("install-test")]
			const result = installOpenCodeTools({ tools })

			expect(result).toBe(true)
			const installed = getInstalledTools()
			expect(installed.has("install-test")).toBe(true)
		})

		it("should respect exclude filter", () => {
			const tools = [createTestTool("include-me"), createTestTool("exclude-me")]
			installOpenCodeTools({ tools, exclude: ["exclude-me"] })

			const installed = getInstalledTools()
			expect(installed.has("include-me")).toBe(true)
			expect(installed.has("exclude-me")).toBe(false)
		})

		it("should respect include filter", () => {
			const tools = [createTestTool("want-this"), createTestTool("not-this")]
			installOpenCodeTools({ tools, include: ["want-this"] })

			const installed = getInstalledTools()
			expect(installed.has("want-this")).toBe(true)
		})
	})

	describe("createOpenCodeToolExport", () => {
		it("should create exportable tool definition", () => {
			const tool = createTestTool("export-tool", "Exportable")
			const def = createOpenCodeToolExport(tool)

			expect(def.description).toBe("Exportable")
			expect(def.args).toHaveProperty("input")
		})
	})
})
