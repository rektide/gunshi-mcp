# Improvements for gunshi-mcp

This document tracks potential improvements to the gunshi-mcp project following the implementation of Phases 1-5.

## Completed Work (Phases 1-5)

✅ **Phase 1: Tool Definition API**
- Created `defineTool<TExtensions>()()` factory function
- Defined `ToolDefinition`, `ToolContext`, `ToolResult` types
- Full type inference for tool handlers

✅ **Phase 2: Schema Introspection**
- Created `zodSchemaToGunshiArgs()` for Zod → Gunshi conversion
- Handles: string, number, boolean, enum, array, object
- Supports: `.optional()`, `.default()`, `.describe()`

✅ **Phase 3: Plugin with Dual Registration**
- Created `createMcpPlugin()` that registers tools as Gunshi commands
- Each tool becomes a CLI command with proper arg definitions

✅ **Phase 4: Tool Context Builder**
- Created `buildToolContext()` for creating tool contexts
- Provides extensions, log methods, and metadata

✅ **Phase 5: Output Formatting**
- Created `extractText()` and `formatResult()` helpers
- Supports text and JSON output formats

✅ **Phase 6: MCP Server Tool Registration**
- Tools now registered with `server.registerTool()`
- Proper ToolResult format with MCP annotations

## High Priority Improvements

### 1. Type Safety (Critical)
**Current State**: Multiple `as any` casts throughout codebase

**Why This Matters**:
- Loses TypeScript's type checking benefits
- Makes refactoring unsafe
- IDE autocomplete doesn't work properly
- Runtime type errors not caught at compile time

**Where Used**:
- `src/mcp-plugin.ts`: `cmdCtx.extensions as any`, `cmdCtx.values as any`
- `src/mcp-plugin.ts`: `tool.inputSchema as any`, `tool.outputSchema as any`
- `src/zod-to-gunshi.ts`: `tool.inputSchema as Record<string, unknown>`

**Proposed Solution**:
```typescript
// Define explicit type parameter for createMcpPlugin
export interface CreateMcpPluginOptions<E extends Record<string, CommandContextExtension>> {
  tools?: ToolDefinition<any, E>[]
  // ...
}

// Then use proper types throughout
const toolCtx = buildToolContext(cmdCtx.extensions)
const result = await tool.handler(cmdCtx.values, toolCtx)
```

**Estimated Effort**: 2-3 hours to refactor with proper generics

---

### 2. Tool Registration Tests (High Priority)
**Current State**: Only basic plugin tests in `tests/basic.test.ts`

**Why This Matters**:
- No verification that tools are registered correctly
- No tests for Zod schema conversion edge cases
- No integration tests with actual MCP server

**Proposed Tests**:
```typescript
// tests/tool-registration.test.ts
describe("Tool Registration", () => {
  it("should register tool as Gunshi command", () => {
    // Test command exists
    // Test args are converted properly
  })

  it("should register tool as MCP tool", () => {
    // Test MCP server has tool
    // Test handler executes correctly
  })

  it("should handle optional fields", () => {
    // Test .optional() → not required
  })

  it("should handle default values", () => {
    // Test .default() → default value set
  })

  it("should handle enum types", () => {
    // Test z.enum() → string type
  })

  it("should handle array types with comma parsing", () => {
    // Test z.array() → comma-separated parse
  })

  it("should handle object types with JSON parsing", () => {
    // Test z.object() → JSON parse
  })
})
```

**Estimated Effort**: 2-3 hours

---

### 3. Tool Discovery Utility (Medium Priority)
**Current State**: Tools must be manually passed to `createMcpPlugin()`

**Why This Matters**:
- Convenient auto-discovery as mentioned in PLAN-mcp.md
- Consistent pattern for projects with many tools
- Reduces boilerplate in plugin setup

**Proposed Solution**:
```typescript
// src/discover-tools.ts
import { readdir } from "node:fs/promises"
import { join } from "node:path"

export async function discoverTools(dir: string = "tools") {
  const toolsDir = join(process.cwd(), dir)
  const files = await readdir(toolsDir)
  const toolFiles = files.filter(f => f.endsWith('.ts') && !f.startsWith('.'))

  const tools: ToolDefinition[] = []
  for (const file of toolFiles) {
    const module = await import(join(toolsDir, file))
    for (const exportName of Object.keys(module)) {
      const exported = module[exportName]
      if (exported && typeof exported === 'object' && 'handler' in exported) {
        tools.push(exported as ToolDefinition)
      }
    }
  }
  return tools
}

// Usage in app setup
import { createMcpPlugin } from 'gunshi-mcp'
import { discoverTools } from './discover-tools.js'

const tools = await discoverTools()
app.use(createMcpPlugin({ tools }))
```

**Estimated Effort**: 2-3 hours

---

## Medium Priority Improvements

### 4. Error Handling & Formatting (Medium)
**Current State**: Tool errors and structured content not well-formatted for CLI

**Why This Matters**:
- CLI needs friendly error messages
- JSON format output needs to be complete
- ToolResult needs proper isError flag handling

**Proposed Solution**:
```typescript
// src/format-result.ts
export function formatToolError(error: Error): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Error: ${error.message}`,
        annotations: { audience: "user" }
      }
    ],
    isError: true
  }
}

export function formatToolResult(result: unknown, format?: "text" | "json"): ToolResult {
  // If it's already a ToolResult, return it
  if (typeof result === 'object' && 'content' in result && Array.isArray(result.content)) {
    return result as ToolResult
  }

  // Otherwise, wrap it
  const content = typeof result === 'object' && result !== null
    ? JSON.stringify(result, null, 2)
    : String(result)

  if (format === "json") {
    return {
      content: [{ type: "text", text: content }],
      structuredContent: result
    }
  }

  return {
    content: [{ type: "text", text: content }]
  }
}
```

**Estimated Effort**: 1-2 hours

---

### 5. Global Format Flag (Medium)
**Current State**: Each command needs `format: "json"` arg added manually

**Why This Matters**:
- Consistent output format across all tools
- User doesn't need to remember `--format json` flag
- Aligns with standard CLI patterns

**Proposed Solution**:
```typescript
// In zodSchemaToGunshiArgs, add format arg automatically
export function zodSchemaToGunshiArgs(
  schema: Record<string, unknown>,
  overrides?: Record<string, Partial<GunshiArg>>,
): Record<string, GunshiArg> {
  const args: Record<string, GunshiArg> = {}

  // Add global format flag to all commands
  args.format = {
    type: "enum",
    description: "Output format (text or json)",
    choices: ["text", "json"],
    default: "text"
  }

  // ... rest of conversion
}
```

**Estimated Effort**: 30 minutes - 1 hour

---

### 6. Documentation & Examples (Medium)
**Current State**: README.md exists but shows old approach, no end-to-end examples

**Why This Matters**:
- Users need clear examples of the new approach
- Show both CLI usage and MCP integration
- Demonstrate tool definition patterns

**Proposed Additions**:
```markdown
## Quick Start

### Defining a Tool

```typescript
import { defineTool } from 'gunshi-mcp'
import { z } from 'zod'

export const deployTool = defineTool<{
  extensions: Record<typeof LOGGER_ID, LoggerExtension>
}>()({
  name: 'deploy',
  title: 'Deploy Application',
  description: 'Deploy to target environment',

  inputSchema: {
    env: z.string().describe('Target environment'),
    force: z.boolean().optional().describe('Force deployment'),
    replicas: z.number().default(1)
  },

  cli: {
    args: {
      env: { short: 'e' },
      force: { short: 'f' }
    }
  },

  handler: async ({ env, force, replicas }, ctx) => {
    ctx.extensions[LOGGER_ID].info(`Deploying to ${env}...`)
    return {
      content: [{ type: 'text', text: `Deployed to ${env}` }],
      structuredContent: { env, success: true }
    }
  }
})
```

### Setting Up the Plugin

```typescript
import { cli } from 'gunshi'
import { createMcpPlugin, createLoggingPlugin } from 'gunshi-mcp'
import { deployTool } from './tools/deploy.js'

const app = cli(
  { name: 'my-app', version: '1.0.0' },
  {
    plugins: [
      createLoggingPlugin(),
      createMcpPlugin({
        tools: [deployTool],
        name: 'my-app',
        version: '1.0.0'
      })
    ]
  }
)
```

### Using the CLI

```bash
# Deploy to production
./my-app deploy --env production

# With JSON output
./my-app deploy --env production --format json
```

### Using as MCP Server

```typescript
// When connected to MCP client, tools are automatically available
// Tool calls invoke the same handler as CLI commands
```
```

**Estimated Effort**: 1-2 hours

---

## Low Priority Improvements

### 7. Extension Type Safety (Low)
**Current State**: `ToolContext<E>` uses untyped `Record<string, unknown>` for extensions

**Why This Matters**:
- Type-safe access to Gunshi extensions in tool handlers
- Better IDE autocomplete and type checking

**Proposed Solution**:
```typescript
// Make extension type parameter
export interface ToolContext<E extends Record<string, CommandContextExtension>> {
  extensions: E
  log: LogMethods
  meta: ToolMeta
}

// Then in tool definition
export const myTool = defineTool<{
  extensions: Record<typeof LOGGER_ID, LoggerExtension>
}>()({
  // ... ctx.extensions[LOGGER_ID] is now typed
})
```

**Estimated Effort**: 1-2 hours (spread across multiple files)

---

### 8. Logging Integration (Low)
**Current State**: Uses `console.log()` directly, no integration with Gunshi logger extension

**Why This Matters**:
- Consistent logging format with rest of app
- Respects global log levels (--verbose, --quiet)
- Better testability

**Proposed Solution**:
```typescript
// src/context.ts
import type { LoggerExtension } from '../plugins/logger.js'

export function buildToolContext<E>(
  extensions: E,
  logger?: LoggerExtension,
  mcpExtra?: McpToolExtra
): ToolContext<E> {
  return {
    extensions,
    log: logger ?? {
      info: (msg, ...args) => console.log(msg, ...args),
      warn: (msg, ...args) => console.warn(msg, ...args),
      error: (msg, ...args) => console.error(msg, ...args),
      debug: (msg, ...args) => console.debug(msg, ...args),
    },
    meta: {
      requestId: mcpExtra?.requestId
    }
  }
}
```

**Estimated Effort**: 30 minutes - 1 hour

---

### 9. Prompt Registration (Low - Future)
**Current State**: Plugin creates MCP server with `prompts: {}` capability but no prompts registered

**Why This Matters**:
- Complete MCP support includes prompts
- Aligns with original README plan
- Could auto-discover from `prompts/` directory

**Proposed Solution**:
```typescript
// src/mcp-plugin.ts - in setup
// After registering tools, register prompts
const promptsDir = options.promptsDir ?? join(process.cwd(), 'prompts')
const promptFiles = await readdir(promptsDir)

for (const file of promptFiles) {
  if (file.endsWith('.md')) {
    const content = await readFile(join(promptsDir, file), 'utf-8')
    const name = file.replace('.md', '')
    server.registerPrompt(name, content)
  }
}
```

**Estimated Effort**: 1-2 hours

---

### 10. Streaming Support (Low - Future)
**Current State**: No support for long-running tools that need to stream output

**Why This Matters**:
- Better user experience for long operations
- Aligns with MCP server capabilities
- Prevents timeout issues

**Estimated Effort**: 3-4 hours (requires understanding of MCP streaming)

---

## Implementation Order Recommendation

### Sprint 1 (Foundational - 1-2 days)
1. **Type Safety (#1)** - Fix `as any` casts
2. **Tool Registration Tests (#2)** - Add comprehensive test coverage
3. **Error Handling (#4)** - Improve CLI error formatting

### Sprint 2 (Developer Experience - 1 day)
4. **Tool Discovery (#3)** - Auto-discovery from `tools/` directory
5. **Global Format Flag (#5)** - Add `--format` to all commands
6. **Documentation (#6)** - Add examples and improve README

### Sprint 3 (Polish - 1-2 days)
7. **Extension Type Safety (#7)** - Type-safe extension access
8. **Logging Integration (#8)** - Use Gunshi logger

### Future Work
9. **Prompt Registration (#9)** - Add prompt support
10. **Streaming Support (#10)** - Long-running tools

---

## Technical Debt & Cleanup

### Unused Files
- `src/plugins/logger.ts` - Keep, used for logging extension
- Old plugin approach in `src/plugin.ts` - Remove or mark as deprecated

### Code Quality
- Add JSDoc comments to public APIs
- Consistent error handling patterns
- Extract magic strings to constants

---

## Total Estimated Effort

| Priority | Item | Effort | Cumulative |
|----------|------|---------|------------|
| High | Type Safety | 2-3h | 2-3h |
| High | Tool Registration Tests | 2-3h | 4-6h |
| Medium | Error Handling | 1-2h | 5-8h |
| Medium | Global Format Flag | 0.5-1h | 5.5-9h |
| Medium | Documentation & Examples | 1-2h | 6.5-11h |
| Low | Extension Type Safety | 1-2h | 7.5-13h |
| Low | Logging Integration | 0.5-1h | 8-14h |
| Low | Prompt Registration | 1-2h | 9-16h |
| Low | Streaming Support | 3-4h | 12-20h |

**Total estimated effort: 12-20 hours**
