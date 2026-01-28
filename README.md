# Gunshi MCP

> A helper kit for getting gratis CLI interfaces when writing MCP

## Overview

Define tools once with Zod schemas and Gunshi's `defineTool()`, and get both:

- **MCP tools** - Exposed to LLMs via Model Context Protocol
- **CLI commands** - Free command-line interfaces for human use

The same tool definition works for both protocols with zero duplication.

## Usage

```typescript
import { defineTool, createMcpPlugin } from "gunshi-mcp"
import { z } from "zod"

// Define a tool with Zod schema
const greetTool = defineTool()({
	name: "greet",
	title: "Greet User",
	description: "Greets a user with a message",
	inputSchema: z.object({
		name: z.string().describe("User name"),
		age: z.number().optional().describe("User age"),
	}),
	handler: async (args, ctx) => {
		return { content: [{ type: "text", text: `Hello, ${args.name}!` }] }
	},
})

// Create MCP plugin
const mcpPlugin = createMcpPlugin({
	tools: [greetTool],
})
```

Add this plugin to your Gunshi CLI to get:

- A CLI command: `my-cli greet --name Alice --age 30`
- An MCP tool that LLMs can call: `my-cli mcp` (stdio mode)

## Architecture

```
GunshiTool (defineTool)
    ↓
createMcpPlugin({ tools: [...] })
    ↓
├─ Registers MCP tools (server.registerTool)
│  └─ Uses Zod schema directly for validation
│
├─ Registers CLI commands (ctx.addCommand)
│  └─ Converts Zod schema to Gunshi args (zodSchemaToGunshiArgs)
│     └─ Flattens nested objects
│     └─ Handles arrays, wrappers, collisions
│
└─ Starts MCP stdio server (my-cli mcp)
```

## Core Concepts

### GunshiTool

Extends the MCP SDK's `Tool` type with Zod schemas and CLI configuration:

```typescript
interface GunshiTool<Shape, TExtensions> extends Omit<Tool, "inputSchema" | "outputSchema"> {
	// Zod schemas (not JSON Schema - SDK converts internally)
	inputSchema: z.ZodObject<Shape>
	outputSchema?: z.ZodTypeAny

	// CLI-specific configuration
	cli?: Partial<Record<string, Partial<ArgSchema>>>  // Per-field overrides
	cliOptions?: {  // Global conversion options
		separator?: string      // Default: "-" (e.g., --config-timeout)
		maxDepth?: number       // Default: 3 (fallback to JSON for deeper)
		arrayHandling?: "json" | "repeated"  // Default: "repeated"
	}

	// Tool handler with validated args
	handler: (args: ZodInput<Shape>, ctx: ToolContext<TExtensions>) => Promise<ToolResult>
}
```

### ToolContext

Provided to tool handlers with logging and metadata:

```typescript
interface ToolContext<E = {}> {
	extensions: E          // From Gunshi plugin extensions
	log: {
		info, warn, error, debug, trace, fatal
	}
	meta: {
		requestId?: string  // From MCP call
	}
}
```

### CLI Args Conversion

Zod schemas are automatically converted to Gunshi CLI arguments:

**Zod Schema:**

```typescript
z.object({
	name: z.string(),
	config: z.object({
		timeout: z.number(),
	}),
})
```

**Generated CLI Args:**

```bash
--name <value>              # name: string
--config-timeout <value>    # config.timeout (flattened with separator "-")
```

**Features:**

- **Flattening** - Nested objects become `--parent-child` flags
- **Arrays** - Repeated flags or JSON string
- **Wrappers** - `z.optional()`, `z.nullable()`, `z.default()` handled
- **Collisions** - Detects naming conflicts (e.g., `a-b` vs `a.b`)
- **Reconstruction** - Builds nested objects from flat CLI args

## API Reference

### `defineTool<TExtensions>()`

Factory function to create type-safe GunshiTool definitions.

```typescript
const tool = defineTool<MyExtensions>()({
	name: "tool-name",
	title: "Tool Title",
	description: "Description",
	inputSchema: z.object({ ... }),
	outputSchema: z.object({ ... }),  // optional
	cliOptions: { separator: "-" },
	handler: async (args, ctx) => {
		return { content: [{ type: "text", text: "result" }] }
	},
})
```

### `createMcpPlugin(options)`

Creates a Gunshi plugin that registers tools as both MCP tools and CLI commands.

```typescript
const plugin = createMcpPlugin({
	tools: [tool1, tool2, ...],
	name?: string,      // Server name (default: "MCP Plugin")
	version?: string,   // Server version (default: "1.0.0")
})
```

### `zodSchemaToGunshiArgs(schema, overrides, options)`

Convert a Zod schema to Gunshi CLI argument definitions (advanced usage).

```typescript
const args = zodSchemaToGunshiArgs(
	schema,
	{ "config-timeout": { type: "string" } },  // overrides
	{ separator: "-", maxDepth: 3, arrayHandling: "repeated" }
)
```

### `reconstructNestedValues(flatValues, separator)`

Rebuild nested objects from flattened CLI args.

```typescript
const flat = { "config-timeout": 30, "name": "test" }
const nested = reconstructNestedValues(flat, "-")
// { config: { timeout: 30 }, name: "test" }
```

### `formatResult(result, format?)`

Format tool results for CLI output.

```typescript
const text = formatResult(result, "text")   // Extract text content
const json = formatResult(result, "json")   // JSON.stringify structuredContent
```

### `buildToolContext(extensions, mcpExtra)`

Build a ToolContext with extensions and logging (advanced usage).

```typescript
const ctx = buildToolContext(ctx.extensions, { requestId: "123" })
```

## Logging Plugin

The `createLoggingPlugin()` provides structured logging with pino:

```typescript
import { createLoggingPlugin } from "gunshi-mcp"

const loggingPlugin = createLoggingPlugin({ global: true })

// Global flags added:
--verbose, -v     # Debug logging
--quiet, -q        # Error logging only
--format           # json or pretty
--log-stdio        # Force stderr (for stdio mode)
--silent           # Suppress all output

// Access logger in tool context:
ctx.extensions.logger.info("message", { data })
ctx.extensions.logger.child({ requestId }).info("nested")
```

## CLI Arguments Module

The `cli-args/` module provides utilities for converting Zod schemas to CLI args:

| Module           | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `flatten.ts`     | Convert nested Zod objects to flat arg names |
| `introspect.ts`  | Extract type info from Zod schemas           |
| `collision.ts`   | Detect naming conflicts in flattened args    |
| `arrays.ts`      | Handle array fields (repeated vs JSON)       |
| `overrides.ts`   | Apply per-field CLI arg overrides            |
| `reconstruct.ts` | Rebuild nested objects from flat args        |

## Development

### Setup

```bash
pnpm install
npm run build  # typecheck, lint, format:check, test
```

### Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Code Style

- TypeScript with `.ts` files
- No comments unless needed
- `oxfmt` for formatting
- `oxlint` for linting

## Dependencies

### Runtime

- `@modelcontextprotocol/server` - MCP SDK
- `gunshi` - CLI framework
- `pino`, `pino-pretty` - Logging

### Development

- `vitest` - Testing
- `oxfmt`, `oxlint` - Format/lint
- `@typescript/native-preview` - Type checking

## License

MIT
