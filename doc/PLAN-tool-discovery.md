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
