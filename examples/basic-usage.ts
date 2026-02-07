import { cli, define } from "gunshi"
import { createMcpPlugin } from "../src/mcp-plugin.ts"
import { defineTool } from "../src/define-tool.ts"
import { z } from "zod"

const greetTool = defineTool()({
	name: "greet",
	title: "Greet User",
	description: "Greet a user by name",
	inputSchema: z.object({
		name: z.string().describe("User name to greet"),
		age: z.number().optional().describe("User age"),
	}),
	handler: async (args) => {
		return { content: [{ type: "text", text: `Hello, ${args.name}!` }] }
	},
})

const listTool = defineTool()({
	name: "list",
	title: "List Items",
	description: "List available items",
	inputSchema: z.object({}),
	handler: async () => {
		return {
			content: [{ type: "text", text: "Available items:\n- Item 1\n- Item 2\n- Item 3" }],
		}
	},
})

const command = define({
	name: "example-cli",
	description: "Example CLI with MCP support",
	args: {
		verbose: {
			type: "boolean",
			description: "Enable verbose output",
		},
	},
	run: (ctx) => {
		if (ctx.values.verbose) {
			console.log("Verbose mode enabled")
		}
		console.log("Example CLI running...")
		console.log("Available commands: greet, list")
		console.log("Run 'example-cli mcp' to start MCP server")
	},
})

await cli(process.argv.slice(2), command, {
	name: "example-cli",
	version: "1.0.0",
	plugins: [createMcpPlugin({ tools: [greetTool, listTool] })],
})
