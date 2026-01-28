# Gunshi MCP

> A helper kit for getting gratis CLI interfaces when writing MCP

## Overview

This plugin integrates Gunshi's command system with the Model Context Protocol, allowing you to:

- Define tools using Zod schemas with `defineTool()`
- Automatically get CLI interfaces for your MCP tools
- Use the same tool definition for both MCP and CLI execution
- Get typed, validated input/output with TypeScript

## Architecture

### Components

```
Gunshi CLI
    ↓
Gunshi Plugin System
    ↓
gunshi-mcp Plugin
    ↓
├─ MCP Server (@modelcontextprotocol/server)
├─ Tool Registry (GunshiTool definitions)
├─ CLI Args Conversion (Zod → Gunshi args)
└─ Tool Execution Handler
```

### Key Features

**GunshiTool Type**

- Extends MCP SDK's `Tool` type
- Uses Zod schemas for `inputSchema` and `outputSchema`
- Includes Gunshi CLI configuration (`cli`, `cliOptions`)
- Type-safe handler with validated arguments

**CLI Args Conversion**

- Sophisticated Zod schema introspection
- Automatic flattening of nested objects
- Collision detection and resolution
- Wrapper unwrapping (optional, nullable, default)
- Reconstruction of nested values from CLI args

**Dual Execution**

- Same tool definition works for MCP and CLI
- MCP: Direct Zod validation, returns `CallToolResult`
- CLI: Converted to Gunshi command args, formatted output

## Usage

### Basic Example

```typescript
import { defineTool } from "gunshi-mcp"
import { createMcpPlugin } from "gunshi-mcp/mcp-plugin"
import { z } from "zod"

// Define a tool with Zod schema
const myTool = defineTool()({
  name: "greet",
  title: "Greet User",
  description: "Greets a user with a message",
  inputSchema: z.object({
    name: z.string().describe("User name"),
    age: z.number().optional().describe("User age"),
  }),
  cliOptions: {
    separator: "-",
  },
  handler: async (args, ctx) => {
    return { message: `Hello, ${args.name}!` }
  },
})

// Create the MCP plugin
const mcpPlugin = createMcpPlugin({
  tools: [myTool],
  name: "my-mcp-server",
  version: "1.0.0",
})
```

### CLI Usage

```bash
# Use the tool via CLI
my-cli greet --name Alice --age 30

# Start MCP server
my-cli mcp
```

## Development Workflow

### Prerequisites

- Node.js (v18 or higher)
- pnpm (preferred package manager)
- beads (task tracker, see AGENTS.md)

### Setup

```bash
# Clone repository
git clone <repo-url>
cd gunshi-mcp

# Install dependencies
pnpm install

# Verify setup
npm run build
```

### Adding New Features

1. **Create task**: Use `bd create` to add tasks for new features
2. **Implement**: Write code following existing patterns
3. **Test**: Run `npm run build` to verify typecheck, lint, and tests
4. **Commit**: Commit changes with clear messages
5. **Close task**: Mark task complete with `bd close <id>`

### Code Style

- Use TypeScript for all code
- Prefer `.ts` files over `.js`
- Run `oxfmt` before committing
- No comments unless explicitly needed
- Follow existing patterns in the codebase

## Testing

### Test Framework

Uses **Vitest** for unit and integration tests.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/fileName.test.ts
```

### Test Organization

Tests are organized by functionality:

- **`test/zod-to-gunshi.ts`** - Zod schema to Gunshi CLI args conversion
- **`test/cli-args/`** - CLI args conversion module tests:
  - `arrays.test.ts` - Array handling
  - `complex-collisions.test.ts` - Complex naming collision resolution
  - `depth-limiting.test.ts` - Nested object depth limiting
  - `documentation-generation.test.ts` - Auto-generated CLI help
  - `error-scenarios.test.ts` - Error handling
  - `overrides.test.ts` - CLI arg override configurations
  - `per-tool-options.test.ts` - Per-tool configuration options
  - `reconstruction-edge-cases.test.ts` - Nested value reconstruction
  - `separator-edge-cases.test.ts` - Custom separators
  - `serialization-round-trip.test.ts` - Round-trip serialization
  - `wrapper-combinations.test.ts` - Zod wrapper unwrapping

## Project Structure

```
gunshi-mcp/
├── src/
│   ├── cli-args/              # CLI args conversion module
│   │   ├── arrays.ts          # Array handling
│   │   ├── collision.ts       # Naming collision detection
│   │   ├── flatten.ts         # Schema flattening
│   │   ├── index.ts           # Module exports
│   │   ├── introspect.ts      # Zod schema introspection
│   │   ├── overrides.ts       # CLI arg overrides
│   │   ├── reconstruct.ts     # Nested value reconstruction
│   │   └── types.ts           # CLI args types
│   ├── context.ts             # Tool context building
│   ├── define-tool.ts         # Tool definition factory
│   ├── index.ts               # Main exports
│   ├── mcp-plugin.ts          # New MCP plugin (GunshiTool)
│   ├── output.ts              # Result formatting
│   ├── plugin.ts              # Original MCP plugin
│   ├── types.ts               # Type definitions (GunshiTool)
│   ├── zod-to-gunshi.ts       # Zod to Gunshi args conversion
│   └── plugins/               # Plugin-specific code
│       └── logger.ts          # Logger plugin
├── test/                      # Test files
│   ├── zod-to-gunshi.ts       # Conversion tests
│   └── cli-args/              # CLI args module tests
├── package.json               # Package configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Dependencies

### Runtime

- `@modelcontextprotocol/server` - MCP TypeScript SDK (server package)
- `gunshi` - CLI framework
- `package-directory` - Project root detection
- `zod` - Schema validation (user-provided)
- `pino` - Logging
- `pino-pretty` - Pretty log output

### Development

- `vitest` - Testing framework
- `tsdown` - TypeScript bundler
- `@typescript/native-preview` - TypeScript type checking
- `oxfmt` - Code formatter
- `oxlint` - Linter
- `concurrently` - Run multiple npm scripts in parallel

## Key Implementation Details

### GunshiTool Type

```typescript
export interface GunshiTool<Shape extends ZodShape = ZodShape, TExtensions = {}>
	extends Omit<Tool, "inputSchema" | "outputSchema"> {
	inputSchema: z.ZodObject<Shape>
	outputSchema?: z.ZodTypeAny

	cli?: Partial<Record<string, Partial<ArgSchema>>>
	cliOptions?: CliOptions

	handler: (args: ZodInput<Shape>, ctx: ToolContext<TExtensions>) => Promise<ToolResult>
}
```

### CLI Args Conversion Flow

1. **Introspection** - Analyze Zod schema structure
2. **Flattening** - Convert nested objects to flat CLI arg names
3. **Collision Detection** - Detect and resolve naming conflicts
4. **Wrapper Unwrapping** - Handle optional, nullable, default wrappers
5. **Reconstruction** - Rebuild nested objects from CLI args

### MCP vs CLI Execution

**MCP:**

- Zod schema passed directly to `server.registerTool()`
- SDK handles JSON Schema conversion internally
- Handler receives parsed Zod args
- Returns `CallToolResult` with formatted content

**CLI:**

- Zod schema converted to Gunshi CLI args
- Handler receives raw CLI values
- Reconstructs nested objects from flat args
- Formats output for console display

## Contributing

1. Check `bd ready` for available tasks
2. Claim a task with `bd update <id> --status in_progress`
3. Implement the feature
4. Run `npm run build` to verify
5. Commit and push changes
6. Close the task with `bd close <id>`

## License

MIT

## Resources

- [Gunshi Documentation](https://github.com/kazupon/gunshi)
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [beads Task Tracker](https://github.com/sst/beads)
