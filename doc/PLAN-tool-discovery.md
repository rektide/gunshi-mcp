# Tool Discovery Plan

**Ticket:** gunshi-mcp-1ev - Command Discovery and Registration

## Overview

Tool discovery finds and loads GunshiTool definitions at runtime. The system is modular: library consumers can replace either discovery strategy or use their own entirely.

Two composable async generators:

1. **Root Discovery** - yields directories to search for tools
2. **Tool Discovery** - yields tools found within each directory

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Root Discovery  │────▶│  Tool Discovery  │────▶│ GunshiTool[]│
│ (directories)   │     │  (per directory) │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

## API Design

### Types

```typescript
import type { GunshiTool } from "./types.js"

/** Yields root directories to search for tools */
export type RootDiscovery = () => AsyncGenerator<string, void, undefined>

/** Yields tools found in a given directory */
export type ToolDiscovery = (rootDir: string) => AsyncGenerator<GunshiTool, void, undefined>

export interface DiscoveryOptions {
  /** Strategy to find root directories. Default: application directory */
  roots?: RootDiscovery
  /** Strategy to find tools in each root. Default: glob patterns */
  tools?: ToolDiscovery
}

export interface GlobToolDiscoveryOptions {
  /** Glob patterns relative to root. Default: ["tools/**/*.{js,ts}", "src/tools/**/*.{js,ts}"] */
  patterns?: string[]
  /** Patterns to ignore */
  ignore?: string[]
}
```

### Default Implementations

#### Root Discovery

```typescript
import { packageDirectory } from "package-directory"

/** Default: yields the directory containing the running application's package.json */
export async function* defaultRootDiscovery(): AsyncGenerator<string> {
  const root = await packageDirectory()
  if (root) {
    yield root
  }
}

/** Yields multiple explicit directories */
export function explicitRoots(...dirs: string[]): RootDiscovery {
  return async function* () {
    for (const dir of dirs) {
      yield dir
    }
  }
}

/** Chains multiple root discovery strategies */
export function chainRoots(...strategies: RootDiscovery[]): RootDiscovery {
  return async function* () {
    for (const strategy of strategies) {
      yield* strategy()
    }
  }
}
```

#### Tool Discovery

```typescript
import { glob } from "tinyglobby"
import { pathToFileURL } from "node:url"

const DEFAULT_PATTERNS = [
  "tools/**/*.{js,ts}",
  "src/tools/**/*.{js,ts}",
]

const DEFAULT_IGNORE = [
  "**/*.test.{js,ts}",
  "**/*.spec.{js,ts}",
  "**/_*.{js,ts}",
  "**/node_modules/**",
]

/** Default: finds tools via glob patterns, imports them, validates exports */
export function globToolDiscovery(options: GlobToolDiscoveryOptions = {}): ToolDiscovery {
  const patterns = options.patterns ?? DEFAULT_PATTERNS
  const ignore = options.ignore ?? DEFAULT_IGNORE

  return async function* (rootDir: string) {
    const files = await glob(patterns, { cwd: rootDir, ignore, absolute: true })

    for (const file of files) {
      const mod = await import(pathToFileURL(file).href)
      const tools = extractTools(mod)
      for (const tool of tools) {
        yield tool
      }
    }
  }
}

/** Extracts GunshiTool instances from a module */
function extractTools(mod: unknown): GunshiTool[] {
  const tools: GunshiTool[] = []

  if (!mod || typeof mod !== "object") return tools

  // Check default export
  if ("default" in mod && isGunshiTool(mod.default)) {
    tools.push(mod.default)
  }

  // Check named exports
  for (const [key, value] of Object.entries(mod)) {
    if (key !== "default" && isGunshiTool(value)) {
      tools.push(value)
    }
  }

  return tools
}

/** Type guard for GunshiTool */
function isGunshiTool(value: unknown): value is GunshiTool {
  return (
    value !== null &&
    typeof value === "object" &&
    "name" in value &&
    "handler" in value &&
    "inputSchema" in value &&
    typeof (value as any).handler === "function"
  )
}
```

### Main Discovery Function

```typescript
/** Discovers all tools using configured strategies */
export async function discoverTools(options: DiscoveryOptions = {}): Promise<GunshiTool[]> {
  const rootDiscovery = options.roots ?? defaultRootDiscovery
  const toolDiscovery = options.tools ?? globToolDiscovery()

  const tools: GunshiTool[] = []

  for await (const rootDir of rootDiscovery()) {
    for await (const tool of toolDiscovery(rootDir)) {
      tools.push(tool)
    }
  }

  return tools
}

/** Streaming variant - yields tools as they're discovered */
export async function* discoverToolsStream(options: DiscoveryOptions = {}): AsyncGenerator<GunshiTool> {
  const rootDiscovery = options.roots ?? defaultRootDiscovery
  const toolDiscovery = options.tools ?? globToolDiscovery()

  for await (const rootDir of rootDiscovery()) {
    yield* toolDiscovery(rootDir)
  }
}
```

## Integration with Plugin

```typescript
export interface McpPluginOptions {
  // Existing
  tools?: GunshiTool[]
  name?: string
  version?: string

  // New
  discovery?: DiscoveryOptions | false
}

export function createMcpPlugin(options: McpPluginOptions = {}) {
  return plugin({
    // ...
    setup: async (ctx) => {
      let tools = options.tools ?? []

      // Auto-discover unless explicitly disabled
      if (options.discovery !== false) {
        const discovered = await discoverTools(options.discovery)
        tools = [...tools, ...discovered]
      }

      // Register tools...
    },
  })
}
```

## Usage Examples

### Default Behavior (Library Consumer)

```typescript
// Discovers tools from tools/ and src/tools/ in app directory
await cli(args, command, {
  plugins: [createMcpPlugin()],
})
```

### Explicit Tools Only

```typescript
// No discovery, only explicit tools
await cli(args, command, {
  plugins: [createMcpPlugin({
    tools: [myTool, otherTool],
    discovery: false,
  })],
})
```

### Custom Patterns

```typescript
// Custom glob patterns
await cli(args, command, {
  plugins: [createMcpPlugin({
    discovery: {
      tools: globToolDiscovery({
        patterns: ["commands/**/*.tool.ts"],
      }),
    },
  })],
})
```

### Multiple Root Directories

```typescript
// Search multiple directories
await cli(args, command, {
  plugins: [createMcpPlugin({
    discovery: {
      roots: chainRoots(
        defaultRootDiscovery,
        explicitRoots("/shared/tools", "/plugins"),
      ),
    },
  })],
})
```

### Fully Custom Discovery

```typescript
// Completely custom discovery (e.g., from database, remote registry)
async function* customRoots() {
  const config = await loadConfig()
  for (const dir of config.toolDirectories) {
    yield dir
  }
}

async function* customTools(rootDir: string) {
  const manifest = await readManifest(rootDir)
  for (const entry of manifest.tools) {
    yield await loadToolFromManifest(entry)
  }
}

await cli(args, command, {
  plugins: [createMcpPlugin({
    discovery: {
      roots: customRoots,
      tools: customTools,
    },
  })],
})
```

## File Structure

```
src/
├── discovery/
│   ├── index.ts          # Main exports
│   ├── types.ts          # RootDiscovery, ToolDiscovery types
│   ├── roots.ts          # defaultRootDiscovery, explicitRoots, chainRoots
│   ├── tools.ts          # globToolDiscovery, extractTools, isGunshiTool
│   └── discover.ts       # discoverTools, discoverToolsStream
```

## Dependencies

Add to package.json:

```json
{
  "dependencies": {
    "tinyglobby": "^0.2.12"
  }
}
```

## Testing

- Unit tests for `isGunshiTool` type guard
- Unit tests for `extractTools` with various module shapes
- Integration test with actual file discovery
- Test custom strategies

## Considerations

### Error Handling

When a tool file fails to import or validate:

- Log warning with file path and error
- Continue discovering other tools
- Optionally: `strict: true` option to throw on first error

### Caching

For performance in long-running processes:

- Optional caching of discovered tools
- File watcher integration for hot reload (future)

### Deduplication

If same tool discovered from multiple roots:

- Later discovery overwrites earlier (or configurable)
- Warn on name collision

---

## Addendum: Plugin-Centric Design

The design above focuses on discovery as a utility. This addendum reframes discovery as a **first-class gunshi plugin** that exposes an extension, enabling proper composition with other plugins.

### Discovery as a Plugin

Following gunshi's plugin patterns, discovery becomes its own plugin that:

1. Runs during `setup` phase to discover tools
2. Exposes a `DiscoveryExtension` for other plugins to access discovered tools
3. Can depend on other plugins (e.g., logging) for error reporting

```typescript
import { plugin } from "gunshi/plugin"
import type { GunshiTool } from "./types.js"

export const DISCOVERY_PLUGIN_ID = "gunshi-mcp:discovery" as const
export type DiscoveryPluginId = typeof DISCOVERY_PLUGIN_ID

export interface DiscoveryExtension {
  /** All discovered tools */
  readonly tools: readonly GunshiTool[]
  /** Re-run discovery (for hot reload scenarios) */
  rediscover: () => Promise<GunshiTool[]>
  /** Check if a tool exists by name */
  hasTool: (name: string) => boolean
  /** Get a tool by name */
  getTool: (name: string) => GunshiTool | undefined
}

export interface DiscoveryPluginOptions {
  /** Root discovery strategy */
  roots?: RootDiscovery
  /** Tool discovery strategy */
  tools?: ToolDiscovery
  /** Fail on discovery errors instead of logging warnings */
  strict?: boolean
}

export function createDiscoveryPlugin(options: DiscoveryPluginOptions = {}) {
  let discoveredTools: GunshiTool[] = []

  const runDiscovery = async (): Promise<GunshiTool[]> => {
    const rootDiscovery = options.roots ?? defaultRootDiscovery
    const toolDiscovery = options.tools ?? globToolDiscovery()

    const tools: GunshiTool[] = []
    for await (const rootDir of rootDiscovery()) {
      for await (const tool of toolDiscovery(rootDir)) {
        tools.push(tool)
      }
    }
    return tools
  }

  return plugin<{}, DiscoveryPluginId, [], DiscoveryExtension>({
    id: DISCOVERY_PLUGIN_ID,
    name: "Tool Discovery Plugin",

    setup: async (ctx) => {
      // Discovery runs during setup phase
      discoveredTools = await runDiscovery()

      // Optionally add a CLI command to list discovered tools
      ctx.addCommand("tools", {
        name: "tools",
        description: "List discovered MCP tools",
        run: () => {
          for (const tool of discoveredTools) {
            console.log(`  ${tool.name} - ${tool.description ?? "(no description)"}`)
          }
        },
      })
    },

    extension: (): DiscoveryExtension => ({
      get tools() {
        return Object.freeze([...discoveredTools])
      },
      rediscover: async () => {
        discoveredTools = await runDiscovery()
        return discoveredTools
      },
      hasTool: (name) => discoveredTools.some((t) => t.name === name),
      getTool: (name) => discoveredTools.find((t) => t.name === name),
    }),
  })
}
```

### MCP Plugin Depends on Discovery Plugin

The MCP plugin declares a dependency on the discovery plugin, accessing tools via the extension:

```typescript
import { plugin } from "gunshi/plugin"
import { DISCOVERY_PLUGIN_ID, type DiscoveryExtension } from "./discovery/index.js"

export const MCP_PLUGIN_ID = "gunshi-mcp:mcp" as const

type DependencyExtensions = {
  [DISCOVERY_PLUGIN_ID]: DiscoveryExtension
}

const dependencies = [DISCOVERY_PLUGIN_ID] as const

export interface McpExtension {
  registerTools: (tools: GunshiTool[]) => void
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
}

export interface McpPluginOptions {
  /** Additional tools beyond discovered ones */
  tools?: GunshiTool[]
  name?: string
  version?: string
}

export function createMcpPlugin(options: McpPluginOptions = {}) {
  let server: McpServer | undefined

  return plugin<DependencyExtensions, typeof MCP_PLUGIN_ID, typeof dependencies, McpExtension>({
    id: MCP_PLUGIN_ID,
    dependencies,

    setup: async (ctx) => {
      server = new McpServer({ name: options.name ?? "gunshi-mcp", version: options.version ?? "1.0.0" })

      ctx.addCommand("mcp", {
        name: "mcp",
        description: "Run MCP server",
        run: async (cmdCtx) => {
          const discovery = cmdCtx.extensions[DISCOVERY_PLUGIN_ID]
          const mcp = cmdCtx.extensions[MCP_PLUGIN_ID]

          // Combine discovered tools with explicit tools
          const allTools = [...discovery.tools, ...(options.tools ?? [])]
          mcp.registerTools(allTools)
          await mcp.startServer()
        },
      })
    },

    extension: (ctx) => {
      // Access discovery extension during extension creation
      const discovery = ctx.extensions[DISCOVERY_PLUGIN_ID]

      return {
        registerTools: (tools) => {
          for (const tool of tools) {
            server?.registerTool(tool.name, /* ... */)
          }
        },
        startServer: async () => {
          const transport = new StdioServerTransport()
          await server?.connect(transport)
        },
        stopServer: async () => {
          await server?.close()
        },
      }
    },
  })
}
```

### Plugin Composition at CLI Level

Library consumers compose plugins at the CLI level:

```typescript
import { cli, define } from "gunshi"
import { createDiscoveryPlugin, createMcpPlugin, createLoggingPlugin } from "gunshi-mcp"

const command = define({
  name: "myapp",
  run: () => console.log("My App"),
})

await cli(process.argv.slice(2), command, {
  name: "myapp",
  version: "1.0.0",
  plugins: [
    createLoggingPlugin(),
    createDiscoveryPlugin({
      roots: explicitRoots("./tools", "./plugins"),
      tools: globToolDiscovery({ patterns: ["**/*.tool.ts"] }),
    }),
    createMcpPlugin({ name: "myapp-mcp" }),
  ],
})
```

### Discovery Without MCP

Because discovery is a separate plugin, consumers can use it independently:

```typescript
// Use discovery for CLI commands without MCP server
await cli(args, command, {
  plugins: [
    createDiscoveryPlugin(),
    // No MCP plugin - just discover tools for CLI use
  ],
})
```

### Logging Integration

Discovery plugin can depend on logging for error reporting:

```typescript
import { LOGGING_PLUGIN_ID, type LoggerExtension } from "./plugins/logger.js"

type DependencyExtensions = {
  [LOGGING_PLUGIN_ID]?: LoggerExtension  // Optional dependency
}

export function createDiscoveryPlugin(options: DiscoveryPluginOptions = {}) {
  return plugin<DependencyExtensions, DiscoveryPluginId, [], DiscoveryExtension>({
    id: DISCOVERY_PLUGIN_ID,

    setup: async (ctx) => {
      // Discovery with error logging
    },

    extension: (ctx) => {
      const logger = ctx.extensions[LOGGING_PLUGIN_ID]

      return {
        // ... extension methods can use logger
      }
    },
  })
}
```

### Revised Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI Application                        │
│  plugins: [logging, discovery, mcp]                         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Logging Plugin  │  │ Discovery Plugin│  │   MCP Plugin    │
│                 │  │                 │  │                 │
│ Extension:      │  │ Extension:      │  │ Extension:      │
│ - log, warn...  │  │ - tools         │  │ - registerTools │
│                 │  │ - rediscover()  │  │ - startServer() │
│                 │◀─│ - getTool()     │◀─│ - stopServer()  │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        ▲                    ▲                    │
        │                    │                    │
        └────────────────────┴────────────────────┘
              optional          depends on
              dependency        discovery
```

### Benefits of Plugin-Centric Approach

1. **Composable**: Each plugin has a single responsibility
2. **Type-Safe Dependencies**: Gunshi's plugin system enforces typed extension access
3. **Testable**: Mock `PluginContext` to test each plugin in isolation
4. **Flexible**: Use discovery without MCP, or MCP without discovery
5. **Consistent with Gunshi**: Follows the patterns established by `@gunshi/plugin-*` packages
6. **Extensible**: Other plugins can depend on discovery to access tools

### Migration Path

1. Extract discovery into `src/discovery/plugin.ts`
2. Update `createMcpPlugin` to depend on discovery plugin
3. Export both plugins from `src/index.ts`
4. Update documentation to show plugin composition
5. Keep `discoverTools()` function as a low-level utility for non-plugin use cases
