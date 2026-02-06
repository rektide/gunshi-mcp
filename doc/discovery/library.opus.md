# Library Reusability Discovery

## Current State

gunshi-mcp currently exposes these modules for library consumers:

### Exported API (via `src/index.ts`)
- `createMcpPlugin` - main plugin factory (from mcp-plugin.ts)
- `defineTool` - type-safe tool definition helper
- `zodSchemaToGunshiArgs`, `reconstructNestedValues` - zod schema conversion
- `buildToolContext` - creates ToolContext for handlers
- `extractText`, `formatResult` - output utilities
- `createLoggingPlugin` - logging plugin factory
- Types: `ToolResult`, `ToolContext`, `GunshiTool`, `Tool`, `GunshiArg`, `McpExtension`, etc.

### What Works Well
1. **Tool definition is clean** - `defineTool<Extensions>()` provides good type inference
2. **Zod integration is solid** - schema-to-CLI conversion handles nested objects, arrays, enums
3. **Plugin architecture exists** - logging plugin shows the pattern for composable plugins
4. **Types are exported** - consumers can type their handlers properly

### Friction Points for Library Consumers

#### 1. Plugin is Opinionated About Application Structure
`createMcpPlugin` automatically adds the `mcp` command and wires tools to CLI commands. A library consumer who wants:
- Just the MCP server without CLI
- Just the CLI without MCP server
- Custom command names
- Different transport (SSE, HTTP)

...must work around the plugin's assumptions.

#### 2. Server Configuration is Hardcoded
```typescript
server = new McpServer({
  name: pluginName,
  version: pluginVersion,
}, {
  capabilities: { tools: {}, prompts: {} },
})
```
Consumers cannot:
- Provide custom capabilities
- Add resources, sampling
- Configure transport options
- Use their own McpServer instance

#### 3. Tool Registration is Coupled to Plugin Lifecycle
`registerTools()` requires the plugin to be initialized first. No way to:
- Register tools programmatically after setup
- Get a list of registered tools
- Dynamically add/remove tools

#### 4. Context Building is Minimal
`buildToolContext` creates a basic context with console-based logging. No integration with:
- The logging plugin (even though it exists)
- Request lifecycle hooks
- Middleware patterns

#### 5. Two Plugin Files Export Similar Things
- `plugin.ts` exports `createMcpPlugin` (default export)
- `mcp-plugin.ts` exports `createMcpPlugin` (named export)

Both have `McpExtension` interfaces. This is confusing.

#### 6. Example Uses Old Plugin
`examples/basic-usage.ts` imports from `plugin.ts` (the older, simpler one), not `mcp-plugin.ts`.

## Options for Improvement

### Option A: Layered API (Recommended)

Create distinct layers that can be used independently:

```
┌─────────────────────────────────────┐
│      createMcpPlugin (full)         │  ← High-level: tools + CLI + MCP
├─────────────────────────────────────┤
│   McpServerFactory / ToolRegistry   │  ← Mid-level: server/tools only
├─────────────────────────────────────┤
│  zodSchemaToGunshiArgs, buildCtx    │  ← Low-level: utilities
└─────────────────────────────────────┘
```

**New exports:**
- `createMcpServer(options)` - just creates and configures McpServer
- `ToolRegistry` - register/list/remove tools
- `createCliFromTools(tools)` - generates CLI commands from tools
- `createMcpPlugin(options)` - uses all of the above (current behavior)

**Benefits:**
- Consumers pick their abstraction level
- Existing code continues to work
- Testing individual layers is easier

### Option B: Configuration Over Convention

Keep single plugin but make everything configurable:

```typescript
createMcpPlugin({
  tools: [...],
  server: {
    name: "my-app",
    capabilities: { tools: {}, resources: {}, prompts: {} },
    transport: "sse" | "stdio" | customTransport,
  },
  cli: {
    enabled: true,
    commandPrefix: "",
    addMcpCommand: true,
  },
  context: {
    useLoggingPlugin: true,
    middleware: [...],
  },
})
```

**Benefits:**
- Single entry point
- Backwards compatible with defaults
- Discoverable via types

**Drawbacks:**
- Large options object
- Still tightly coupled internally

### Option C: Builder Pattern

```typescript
const mcp = mcpBuilder()
  .withTools(tools)
  .withServer({ name: "my-app" })
  .withTransport(new StdioServerTransport())
  .withLogging(createLoggingPlugin())
  .buildPlugin()
```

**Benefits:**
- Clear, fluent API
- Each method can validate/transform
- Good IDE completion

**Drawbacks:**
- More code to maintain
- Runtime overhead

### Option D: Separate Packages

Split into:
- `gunshi-mcp-core` - types, utilities, zod conversion
- `gunshi-mcp-server` - McpServer wrapper
- `gunshi-mcp-cli` - CLI integration
- `gunshi-mcp` - re-exports all, provides plugin

**Benefits:**
- Consumers only pay for what they use
- Clear separation of concerns
- Tree-shaking friendly

**Drawbacks:**
- Monorepo overhead
- Version coordination

## Recommended Path Forward

**Start with Option A (Layered API)** with these specific changes:

### Phase 1: Extract Core Components

1. **Create `src/server.ts`** - McpServer factory
   ```typescript
   export interface McpServerOptions {
     name: string
     version: string
     capabilities?: Capabilities
   }
   export function createServer(options: McpServerOptions): McpServer
   ```

2. **Create `src/registry.ts`** - Tool registration
   ```typescript
   export class ToolRegistry {
     register(tool: GunshiTool): void
     unregister(name: string): void
     list(): GunshiTool[]
     applyTo(server: McpServer): void
   }
   ```

3. **Consolidate plugins** - Remove `plugin.ts`, keep only `mcp-plugin.ts`

### Phase 2: Improve Plugin Configurability

4. **Add transport option** to `McpNewPluginOptions`
5. **Add `cli.enabled` option** to skip CLI command generation
6. **Connect logging plugin** to tool context

### Phase 3: Documentation

7. **Update example** to show layered usage
8. **Add library usage guide** in README
9. **Export map** in package.json for subpath imports:
   ```json
   "exports": {
     ".": "./gunshi-mcp.js",
     "./server": "./src/server.js",
     "./registry": "./src/registry.js",
     "./types": "./src/types.js"
   }
   ```

## Summary

| Aspect | Current | After Changes |
|--------|---------|---------------|
| Use as high-level plugin | ✅ Works | ✅ Works |
| Use just MCP server | ❌ Must use plugin | ✅ `createServer()` |
| Use just CLI from tools | ❌ Coupled to MCP | ✅ `createCliFromTools()` |
| Custom transport | ❌ Hardcoded stdio | ✅ Configurable |
| Tool registration | ❌ Setup-time only | ✅ ToolRegistry |
| Logging integration | ❌ Separate | ✅ Connected |
| Subpath imports | ❌ Single entry | ✅ Multiple entries |

The layered approach lets gunshi-mcp serve both quick-start users (use the plugin) and library authors (use individual components).
