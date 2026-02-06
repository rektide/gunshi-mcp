# Library Reusability Assessment

## Executive Summary

**Current Status:** Moderate - Works but requires significant boilerplate and has confusing inconsistencies.

**The library is functional** but has several issues that make it harder than necessary for consumers to use as a library. Users can successfully build Gunshi applications with MCP support, but the API requires multiple manual steps and contains confusing duplication.

## Current User Experience

### What Users Must Do Today

To create a new Gunshi application with MCP support, users need to write ~30+ lines of boilerplate:

```typescript
import { defineTool, createMcpPlugin } from "gunshi-mcp"
import { cli, define } from "gunshi"
import { z } from "zod"

// 1. Manually define each tool
const greetTool = defineTool()({
	name: "greet",
	title: "Greet User",
	description: "Greets a user",
	inputSchema: z.object({
		name: z.string(),
		age: z.number().optional(),
	}),
	handler: async (args) => ({ content: [{ type: "text", text: `Hello ${args.name}!` }] }),
})

const listTool = defineTool()({
	name: "list",
	title: "List Items",
	description: "List available items",
	inputSchema: z.object({}),
	handler: async () => ({ content: [{ type: "text", text: "items" }] }),
})

// 2. Manually create MCP plugin with tools array
const mcpPlugin = createMcpPlugin({
	tools: [greetTool, listTool],
})

// 3. Manually define root command
const rootCommand = define({
	name: "my-cli",
	description: "My CLI application",
	run: (ctx) => {
		console.log("Run a command...")
	},
})

// 4. Manually start CLI with plugins
await cli(process.argv.slice(2), rootCommand, {
	name: "my-cli",
	version: "1.0.0",
	plugins: [mcpPlugin],
})
```

**Problems with this approach:**
1. Requires manual coordination of 4 different pieces
2. Easy to forget a step or wire things incorrectly
3. Tools, plugin, and root command are defined separately
4. Root command often just prints help - wasted boilerplate
5. If you want logging, need to manually add createLoggingPlugin
6. No opinionated defaults or conventions

## Issues With Current Design

### 1. Two Confusing Plugin Implementations

The library exports TWO different MCP plugins:

**`src/plugin.ts` (older/incomplete):**
- Creates empty MCP server
- Does NOT register tools
- Does NOT create CLI commands for tools
- Adds `mcp` command to start server
- Exported as `default createMcpPlugin`

**`src/mcp-plugin.ts` (newer/complete):**
- Creates MCP server
- DOES register tools as MCP tools
- DOES create CLI commands for tools
- Adds `mcp` command to start server
- Exported via namespace: `gunshi-mcp:mcp`

**Both are exported** from `src/index.ts`:
```typescript
export * from "./plugin.ts"  // Old version
export * from "./mcp-plugin.js"  // New version
```

**Confusion:**
- Which one should users use?
- The example uses the old one (`examples/basic-usage.ts`)
- The README shows the new one
- Package exports are ambiguous

### 2. Example is Outdated and Incomplete

`examples/basic-usage.ts`:
```typescript
import createMcpPlugin from "../src/plugin.ts"  // OLD plugin!
```

Problems:
- Uses the OLD plugin that doesn't register tools
- Doesn't define any `defineTool` instances
- Doesn't pass tools to `createMcpPlugin()`
- Won't actually work for MCP tool registration
- Misleading for new users

### 3. Manual Root Command Boilerplate

Users must always write this pattern:
```typescript
const rootCommand = define({
	name: "my-cli",
	description: "...",
	run: (ctx) => {
		console.log("Usage...")
	},
})
```

**Issue:**
- Most CLIs just need subcommands (the tools)
- Root command exists only to hold the plugins
- This is wasted effort
- Users copy-paste this without understanding

### 4. Manual Plugin Coordination

Users must manually track and coordinate:
- Tool definitions array
- MCP plugin instance
- Logging plugin instance (optional)
- Root command
- CLI initialization with plugins array

**Problem:**
- Easy to make mistakes
- Order matters
- TypeScript doesn't help catch configuration errors
- Hard to maintain as app grows

### 5. No Opinionated Defaults

The library provides primitives but no conventions:
- No recommended way to structure tools directory
- No help with configuration management
- No opinionated way to organize the CLI
- No built-in common plugins or defaults

### 6. Low-Level Primitives Are Exported

The library exports many low-level details:
```typescript
export { zodSchemaToGunshiArgs, reconstructNestedValues }
export { buildToolContext }
export { extractText, formatResult }
export { ToolResult, ToolContext, GunshiArg, ... }
```

**Issue:**
- Most users don't need these
- Confusing API surface
- Makes library feel like "implementation details"
- Should be internal or advanced-only

### 7. No "All-in-One" Entry Point

Users must manually assemble everything. There's no single function that says "build me a CLI with these tools".

### 8. Missing Common Patterns

No support for common patterns like:
- Tool auto-discovery from directory
- Configuration from files
- Environment variable handling
- Nested command groups
- Built-in help/version commands

## What Works Well

Despite the issues, some things are good:

### 1. Tool Definition API

`defineTool()` is clean:
```typescript
const tool = defineTool()({
	name: "my-tool",
	inputSchema: z.object({...}),
	handler: async (args, ctx) => {...},
})
```

### 2. Type Safety

Zod integration provides good type inference. Users get autocomplete and type checking for tool arguments.

### 3. Dual CLI/MCP Output

Tools work as both:
- CLI commands with `--flag` syntax
- MCP tools with JSON schema validation

This is the core value prop and it works well.

### 4. Flexible CLI Args

The `zodSchemaToGunshiArgs` conversion is sophisticated:
- Flattens nested objects
- Handles arrays
- Supports separators and depth limits
- Collision detection
- Wrappers (optional, default, nullable)

### 5. Good Testing Infrastructure

The library has extensive tests for conversion logic, showing it's a solid foundation.

## Improvements to Enable Better Library Reusability

### Option A: High-Level Builder API (Recommended)

Create a high-level builder that handles all the boilerplate:

```typescript
import { buildCli } from "gunshi-mcp"
import { z } from "zod"

const app = buildCli({
	name: "my-app",
	version: "1.0.0",
	description: "My awesome CLI",
	
	tools: {
		greet: {
			title: "Greet User",
			description: "Greet someone by name",
			inputSchema: z.object({
				name: z.string(),
				age: z.number().optional(),
			}),
			handler: async (args) => {
				return { content: [{ type: "text", text: `Hello ${args.name}!` }] }
			},
		},
		
		list: {
			title: "List Items",
			description: "List all items",
			inputSchema: z.object({}),
			handler: async () => {
				return { content: [{ type: "text", text: "items" }] }
			},
		},
	},
	
	plugins: {
		logging: true,  // Built-in!
	},
})

await app.run()
```

**Benefits:**
- Single function call
- No manual plugin setup
- Tools are co-located
- Built-in common plugins
- Clearer structure

**Implementation:**
```typescript
// src/builder.ts
export function buildCli<Tools extends Record<string, GunshiTool<any, any>>>(config: {
	name: string
	version: string
	description?: string
	tools: Tools
	plugins?: {
		logging?: boolean | LoggingPluginOptions
		config?: boolean | string
	}
}) {
	const toolList = Object.values(config.tools) as GunshiTool<any, any>[]
	
	const plugins = []
	if (config.plugins?.logging) {
		plugins.push(createLoggingPlugin(
			typeof config.plugins.logging === 'boolean' ? {} : config.plugins.logging
		))
	}
	
	plugins.push(createMcpPlugin({
		tools: toolList,
		name: config.name,
		version: config.version,
	}))
	
	return {
		run: async () => {
			await cli(process.argv.slice(2), {
				name: config.name,
				version: config.version,
				description: config.description,
				plugins,
			})
		},
	}
}
```

### Option B: Simplified Plugin Setup

Keep the current API but simplify plugin creation:

```typescript
import { createApp } from "gunshi-mcp"
import { defineTool } from "gunshi-mcp"
import { z } from "zod"

const tool1 = defineTool()({...})
const tool2 = defineTool()({...})

const app = createApp({
	name: "my-app",
	version: "1.0.0",
	tools: [tool1, tool2],
	logging: true,  // Auto-add logging plugin
})

await app.run()
```

### Option C: Tool Auto-Discovery

Support discovering tools from a directory:

```typescript
// tools/greet.ts
export default defineTool()({
	name: "greet",
	inputSchema: z.object({ name: z.string() }),
	handler: async (args) => ({ content: [{ type: "text", text: `Hi ${args.name}` }] }),
})

// tools/list.ts
export default defineTool()({...})

// index.ts
import { discoverTools, buildCli } from "gunshi-mcp"

const tools = await discoverTools("./tools")

const app = buildCli({
	name: "my-app",
	tools,
})

await app.run()
```

### Option D: Configuration File Support

Load configuration from files:

```typescript
// myapp.config.ts
export default {
	name: "my-app",
	version: "1.0.0",
	logging: { level: "debug" },
}

// index.ts
import { loadConfig, buildCli } from "gunshi-mcp"

const config = await loadConfig()
const tools = defineMyTools()
const app = buildCli({ ...config, tools })

await app.run()
```

### Option E: Remove Confusion - Clean Up Exports

1. **Delete or deprecate old plugin:**
   - Remove `src/plugin.ts` (old incomplete version)
   - Only export from `src/mcp-plugin.ts`
   - Clear documentation

2. **Hide implementation details:**
   - Don't export `zodSchemaToGunshiArgs`, `reconstructNestedValues`, `buildToolContext`
   - Keep as internal or mark as `@internal` in docs
   - Export from `./internals` for advanced use cases

3. **Fix the example:**
   - Update `examples/basic-usage.ts` to use the new plugin
   - Show actual tool definitions
   - Demonstrate working MCP setup

### Option F: Provide Preset Configurations

Common patterns as presets:

```typescript
import { preset } from "gunshi-mcp"

const app = buildCli({
	name: "my-app",
	...preset.production,  // Includes logging, error handling, etc.
	tools: [...],
})

await app.run()
```

Presets could include:
- `preset.minimal` - Just core MCP functionality
- `preset.development` - Includes debug logging, verbose output
- `preset.production` - Structured logging, error tracking

### Option G: Nested Command Groups

Support organizing tools into groups:

```typescript
const app = buildCli({
	name: "my-app",
	tools: {
		"db:": {  // Namespace/group
			migrate: { /* tool */ },
			seed: { /* tool */ },
			backup: { /* tool */ },
		},
		"deploy:": {
			prod: { /* tool */ },
			staging: { /* tool */ },
		},
	},
})

// CLI: my-app db migrate
// MCP tool: db-migrate
```

## Recommendations

### Immediate Actions (High Priority)

1. **Clean up plugin exports:**
   - Remove or deprecate `src/plugin.ts`
   - Only export the working MCP plugin
   - Update documentation to be clear about which to use

2. **Fix the example:**
   - Update `examples/basic-usage.ts` to work
   - Show complete working setup
   - Use the correct plugin

3. **Hide internal exports:**
   - Don't export low-level utilities by default
   - Provide `@gunshi-mcp/internals` for advanced users

### Short-Term (Medium Priority)

4. **Add high-level builder API:**
   - Implement `buildCli()` function
   - Auto-coordinate plugins, tools, CLI setup
   - Include built-in logging plugin

5. **Add configuration support:**
   - Support loading config from files
   - Provide sensible defaults
   - Document configuration options

### Long-Term (Low Priority)

6. **Tool discovery:**
   - Support auto-discovering tools from directory
   - Convention over configuration approach

7. **Command grouping:**
   - Support nested command namespaces
   - Better organize large CLIs

8. **Presets:**
   - Provide common configurations
   - Reduce decision fatigue for users

## Comparison: Current vs Improved

### Current API (30+ lines)

```typescript
import { defineTool, createMcpPlugin } from "gunshi-mcp"
import { cli, define } from "gunshi"
import { z } from "zod"

const tool1 = defineTool()({...})
const tool2 = defineTool()({...})
const mcpPlugin = createMcpPlugin({ tools: [tool1, tool2] })
const rootCommand = define({ name: "...", run: (ctx) => {...} })
await cli(process.argv.slice(2), rootCommand, {
	plugins: [mcpPlugin],
})
```

### Improved API (10-15 lines)

```typescript
import { buildCli } from "gunshi-mcp"
import { z } from "zod"

const app = buildCli({
	name: "my-app",
	version: "1.0.0",
	tools: {
		tool1: { inputSchema: z.object({...}), handler: async (args) => {...} },
		tool2: { inputSchema: z.object({...}), handler: async (args) => {...} },
	},
	logging: true,
})

await app.run()
```

**Result:** 50-70% less boilerplate, harder to make mistakes, clearer intent.

## Conclusion

The gunshi-mcp library has a solid foundation with great type safety and dual CLI/MCP output. However, it suffers from:

1. **Confusion:** Two plugin implementations, outdated examples
2. **Boilerplate:** Requires manual coordination of many pieces
3. **No Opinions:** No built-in patterns or conventions
4. **Exposed Internals:** Exports low-level details most users don't need

**Recommended path forward:**
1. Clean up exports (immediate)
2. Add high-level `buildCli()` API (short-term)
3. Add tool discovery and configuration support (long-term)

These changes would make the library significantly more reusable and approachable for new users while maintaining the flexibility that advanced users need.
