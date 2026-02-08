# PLAN-gunshi.md: Gunshi → MCP Integration

> **Goal**: Authors write Gunshi commands, and they automatically work as MCP tools.

## Core Concept

Gunshi's command definition includes `args` with typed schemas. MCP tools require Zod schemas for input validation. The bridge converts Gunshi's arg definitions to Zod schemas and wraps command execution, preserving access to the full Gunshi extension ecosystem.

## Plugin Identity

```typescript
// src/types.ts
export const MCP_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpPluginId = typeof MCP_PLUGIN_ID

export interface McpExtension {
  readonly server: McpServer
  startServer: (options?: { port?: number }) => Promise<void>
  stopServer: () => Promise<void>
  registerTool: (name: string, schema: z.ZodRawShape, handler: ToolHandler) => void
}
```

## Gunshi Command Structure

```typescript
import { define } from 'gunshi'
import { pluginId as loggerId, LoggerExtension } from './plugins/logger/types.js'

const command = define<{
  extensions: Record<typeof loggerId, LoggerExtension>
}>({
  name: 'deploy',
  description: 'Deploy to environment',
  args: {
    env: { type: 'string', required: true, description: 'Target environment' },
    force: { type: 'boolean', short: 'f', description: 'Force deployment' },
    replicas: { type: 'number', default: 1 },
    source: { type: 'positional', description: 'Source directory' }
  },
  run: ctx => {
    const logger = ctx.extensions[loggerId]
    logger.log(`Deploying to ${ctx.values.env}`)
    // implementation
  }
})
```

## MCP Tool (Auto-Generated)

```typescript
server.registerTool('deploy', {
  title: 'deploy',
  description: 'Deploy to environment',
  inputSchema: {
    env: z.string().describe('Target environment'),
    force: z.boolean().optional().describe('Force deployment'),
    replicas: z.number().default(1),
    source: z.string().optional().describe('Source directory')
  }
}, async (args, extra) => {
  // Execute with full extension access
  const result = await executeGunshiCommand(command, args, ctx.extensions)
  return { content: [{ type: 'text', text: result }] }
})
```

## Type Mapping: Gunshi Args → Zod Schema

| Gunshi `type`    | Zod Schema       | Notes                           |
| ---------------- | ---------------- | ------------------------------- |
| `string`         | `z.string()`     |                                 |
| `boolean`        | `z.boolean()`    |                                 |
| `number`         | `z.number()`     |                                 |
| `positional`     | `z.string()`     | Treated as optional string      |
| `custom`         | `z.string()`     | Accept string, parse at runtime |
| `required: true` | no `.optional()` |                                 |
| `default: X`     | `.default(X)`    |                                 |
| `description: Y` | `.describe(Y)`   |                                 |

## Implementation Phases

### Phase 1: Plugin Foundation with Proper Types

```typescript
// src/plugin.ts
import { plugin } from "gunshi/plugin"
import { MCP_PLUGIN_ID, McpExtension } from "./types.js"
import type { LoggerExtension, LoggerId } from "./plugins/logger/types.js"

export default function createMcpPlugin(options: McpPluginOptions = {}) {
  return plugin<
    { [K in LoggerId]: LoggerExtension },  // Required extensions
    typeof MCP_PLUGIN_ID,                   // Plugin ID type
    [LoggerId],                             // Dependencies
    McpExtension                            // Exposed extension
  >({
    id: MCP_PLUGIN_ID,
    name: "MCP Plugin",
    dependencies: [loggerId],

    setup: async (ctx) => {
      // Use ctx.data instead of module-level state
      const server = new McpServer({
        name: options.name ?? "gunshi-mcp",
        version: options.version ?? "1.0.0"
      })
      ctx.data.set("mcp:server", server)

      // Register commands as tools
      for (const [name, command] of ctx.subCommands) {
        registerCommandAsTool(server, name, command, ctx.extensions)
      }
    },

    // Lifecycle cleanup
    onExtension: (ctx) => {
      const shutdown = async () => {
        const server = ctx.data.get("mcp:server") as McpServer
        await server?.close()
      }
      process.on("SIGTERM", shutdown)
      process.on("SIGINT", shutdown)
    },

    extension: (ctx): McpExtension => {
      const server = ctx.data.get("mcp:server") as McpServer
      return {
        server,
        startServer: async (opts) => { /* ... */ },
        stopServer: async () => { /* ... */ },
        registerTool: (name, schema, handler) => { /* ... */ }
      }
    }
  })
}
```

### Phase 2: Schema Conversion

```typescript
// src/schema.ts
import { z } from "zod"
import type { ArgOptions } from "gunshi"

export function gunshiArgsToZod(args: Record<string, ArgOptions>): z.ZodRawShape {
  const schema: z.ZodRawShape = {}

  for (const [name, arg] of Object.entries(args)) {
    let field: z.ZodTypeAny

    switch (arg.type) {
      case 'string':
      case 'positional':
        field = z.string()
        break
      case 'number':
        field = z.number()
        break
      case 'boolean':
        field = z.boolean()
        break
      case 'custom':
        field = z.string() // Parse later via stored parser
        break
      default:
        field = z.string()
    }

    if (arg.description) {
      field = field.describe(arg.description)
    }

    if (arg.default !== undefined) {
      field = field.default(arg.default)
    } else if (!arg.required) {
      field = field.optional()
    }

    schema[name] = field
  }

  return schema
}
```

### Phase 3: Command Registration with Extension Access

```typescript
// src/register.ts
function registerCommandAsTool(
  server: McpServer,
  name: string,
  command: Command,
  extensions: Extensions
) {
  const zodSchema = gunshiArgsToZod(command.args ?? {})
  const parsers = extractCustomParsers(command.args ?? {})

  server.registerTool(name, {
    title: command.name ?? name,
    description: command.description ?? '',
    inputSchema: zodSchema
  }, async (args) => {
    // Apply custom parsers
    const parsed = applyParsers(args, parsers)

    // Build command context with full extension access
    const ctx = buildCommandContext(command, parsed, extensions)

    // Execute and capture output
    const result = await captureOutput(() => command.run(ctx))

    return {
      content: [{ type: 'text', text: result.output }],
      structuredContent: result.returnValue
    }
  })
}
```

### Phase 4: Command Decorator for Telemetry

```typescript
// src/plugin.ts (in setup)
ctx.decorateCommand(baseRunner => async (context) => {
  const logger = ctx.extensions[loggerId]
  const startTime = Date.now()

  logger.debug(`[mcp] Executing command: ${context.name}`)

  try {
    const result = await baseRunner(context)
    logger.debug(`[mcp] Command ${context.name} completed in ${Date.now() - startTime}ms`)
    return result
  } catch (error) {
    logger.error(`[mcp] Command ${context.name} failed: ${error}`)
    throw error
  }
})
```

### Phase 5: Output Capture

```typescript
// src/capture.ts
interface CapturedOutput {
  stdout: string
  stderr: string
  returnValue: unknown
}

async function captureOutput(fn: () => Promise<unknown>): Promise<CapturedOutput> {
  const chunks: string[] = []
  const errChunks: string[] = []

  const originalWrite = process.stdout.write.bind(process.stdout)
  const originalErrWrite = process.stderr.write.bind(process.stderr)

  process.stdout.write = (chunk: string) => { chunks.push(chunk); return true }
  process.stderr.write = (chunk: string) => { errChunks.push(chunk); return true }

  try {
    const returnValue = await fn()
    return {
      stdout: chunks.join(''),
      stderr: errChunks.join(''),
      returnValue
    }
  } finally {
    process.stdout.write = originalWrite
    process.stderr.write = originalErrWrite
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Gunshi CLI App                    │
├─────────────────────────────────────────────────────┤
│  plugins: [logger(), config(), mcp()]               │
│                                                     │
│  define<{ extensions: ... }>({                      │
│    name: 'deploy',                                  │
│    args: { env: { type: 'string', required: true }} │
│    run: ctx => {                                    │
│      ctx.extensions[loggerId].log(...)              │
│    }                                                │
│  })                                                 │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              gunshi-mcp plugin (setup)              │
├─────────────────────────────────────────────────────┤
│  1. Access ctx.subCommands                          │
│  2. Convert args → Zod schema                       │
│  3. Register as MCP tool                            │
│  4. Pass ctx.extensions to tool handler             │
│  5. Wrap with command decorator for telemetry       │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    MCP Server                       │
├─────────────────────────────────────────────────────┤
│  tools: [                                           │
│    {                                                │
│      name: 'deploy',                                │
│      handler: (args) => {                           │
│        // Has access to logger, config, etc.        │
│        extensions[loggerId].log(...)                │
│      }                                              │
│    }                                                │
│  ]                                                  │
└─────────────────────────────────────────────────────┘
```

## Unified Definition API (Optional Enhancement)

Authors could use an extended `define()` that adds MCP-specific metadata:

```typescript
import { defineMcp } from 'gunshi-mcp'
import { loggerId, LoggerExtension } from './plugins/logger/types.js'

const command = defineMcp<{
  extensions: Record<typeof loggerId, LoggerExtension>
}>({
  name: 'deploy',
  description: 'Deploy application',

  args: {
    env: { type: 'string', required: true },
    force: { type: 'boolean', short: 'f' }
  },

  // MCP-specific overrides (optional)
  mcp: {
    title: 'Deploy Application',
    annotations: { audience: ['developer'] },
    // Override schema for specific args
    inputSchema: {
      env: z.enum(['staging', 'production']).describe('Target environment')
    }
  },

  run: ctx => {
    ctx.extensions[loggerId].log(`Deploying to ${ctx.values.env}`)
  }
})
```

## Extension Ecosystem Integration

Tools have full access to all registered plugin extensions:

```typescript
// Command using multiple extensions
const backupCommand = define<{
  extensions:
    & Record<typeof loggerId, LoggerExtension>
    & Record<typeof configId, ConfigExtension>
    & Record<typeof cacheId, CacheExtension>
}>({
  name: 'backup',
  args: { path: { type: 'string', required: true } },
  run: async ctx => {
    const logger = ctx.extensions[loggerId]
    const config = ctx.extensions[configId]
    const cache = ctx.extensions[cacheId]

    logger.log('Starting backup...')
    const backupPath = config.get('backup.destination')
    await cache.set('lastBackup', Date.now())
  }
})

// When executed as MCP tool, all extensions are available
```

## Files to Create/Modify

| File                | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `src/types.ts`      | Plugin ID, extension interface exports          |
| `src/schema.ts`     | `gunshiArgsToZod()` conversion                  |
| `src/register.ts`   | Command-to-tool registration                    |
| `src/capture.ts`    | Output capture utilities                        |
| `src/plugin.ts`     | Plugin with proper types, decorators, lifecycle |
| `src/define-mcp.ts` | Optional `defineMcp()` helper                   |

## Limitations

1. **Positional args**: MCP doesn't have positional concept; converted to named optional params
2. **Interactive commands**: MCP tools are non-interactive; commands requiring stdin won't work
3. **Custom parsers**: String input only; complex types serialized as JSON strings
4. **Streaming output**: MCP supports streaming but requires explicit handling
5. **Short flags**: Ignored in MCP context (no `-f` equivalent)

## Advantages

1. **Single definition**: Write once, use from CLI and MCP
2. **Type safety**: Gunshi's TypeScript inference carries through
3. **Existing ecosystem**: All existing Gunshi commands become MCP-enabled
4. **Extension access**: Tools can use logger, config, auth, cache plugins
5. **Familiar patterns**: Authors use Gunshi's well-documented API
6. **Command decorators**: Automatic telemetry, logging, error handling

## Lazy Commands

Gunshi's `lazy()` function separates **command metadata** from **command implementation**, enabling fast startup and on-demand loading. This is critical for CLIs with many commands or heavy dependencies.

### Core Concept

```typescript
import { lazy, define } from 'gunshi'
import type { CommandRunner } from 'gunshi'

// Metadata: bundled immediately, used for --help
const deployMeta = define({
  name: 'deploy',
  description: 'Deploy to environment',
  args: {
    env: { type: 'string', required: true },
    force: { type: 'boolean', short: 'f' }
  }
})

// Loader: called only when command is executed
const deployLoader = async (): Promise<CommandRunner> => {
  // Heavy imports happen here, not at startup
  const { run } = await import('./commands/deploy.ts')
  return run
}

// Combine: metadata available immediately, implementation deferred
const lazyDeploy = lazy(deployLoader, deployMeta)
```

### Key Properties

| Property | When Available | What It Contains |
|----------|----------------|------------------|
| Metadata | Immediately at registration | name, description, args schema |
| Loader | Called on command execution | Returns runner function |
| `commandName` | Immediately | Access via `lazyDeploy.commandName` (not `.name`) |

### Registration in Plugins

```typescript
import { plugin } from 'gunshi/plugin'
import { lazy, define } from 'gunshi'

const toolsPlugin = plugin({
  id: 'tools',
  setup: async (ctx) => {
    // Quick manifest load - just names and descriptions
    const manifest = await import('./tools/manifest.json')
    
    for (const tool of manifest.tools) {
      const lazyCmd = lazy(
        // Loader: full tool code loaded on execution
        async () => {
          const mod = await import(tool.path)
          return mod.run
        },
        // Metadata: available immediately for --help
        define({
          name: tool.name,
          description: tool.description,
          args: tool.args
        })
      )
      
      ctx.addCommand(lazyCmd.commandName, lazyCmd)
    }
  }
})
```

### Two-Tier Discovery Pattern

For dynamic tool discovery, use a two-tier approach:

```typescript
// Tier 1: Quick manifest extraction (runs during setup)
async function quickDiscoverManifests(patterns: string[]) {
  const files = await glob(patterns)
  return Promise.all(files.map(async file => {
    // Extract metadata WITHOUT importing full module
    // Options: read JSDoc/frontmatter, use manifest.json, or naming conventions
    return {
      name: path.basename(file, '.ts'),
      description: await extractDescription(file),
      args: await extractArgsSchema(file),
      path: file
    }
  }))
}

// Tier 2: Full loading (runs on command execution)
async function loadFullTool(path: string) {
  const mod = await import(path)
  return {
    schema: mod.schema,    // Full Zod schema
    execute: mod.execute   // Implementation
  }
}
```

### Manifest File Approach

Pre-generate a manifest at build time for fastest startup:

```json
{
  "tools": [
    {
      "name": "fetch-data",
      "description": "Fetch data from a URL",
      "path": "./tools/fetch-data.ts",
      "args": {
        "url": { "type": "string", "required": true },
        "format": { "type": "string", "default": "json" }
      }
    }
  ]
}
```

```typescript
setup: async (ctx) => {
  const { tools } = await import('./manifest.json')
  
  for (const tool of tools) {
    ctx.addCommand(
      tool.name,
      lazy(
        async () => (await import(tool.path)).run,
        define({ name: tool.name, description: tool.description, args: tool.args })
      )
    )
  }
}
```

### Advanced: Loader Returns Full Command

Loaders can return complete `Command` objects for dynamic configuration:

```typescript
const dynamicLoader = async () => {
  const config = await loadConfig()
  
  return define({
    description: `Command (env: ${config.env})`,
    args: {
      verbose: {
        type: 'boolean',
        description: config.debug ? 'Verbose (DEBUG mode)' : 'Verbose'
      }
    },
    run: ctx => {
      console.log(config.debug ? 'Debug mode' : 'Normal mode')
    }
  })
}

const dynamicCmd = lazy(dynamicLoader, { name: 'dynamic', description: 'Dynamic command' })
```

### MCP Integration with Lazy Commands

Lazy commands work seamlessly with MCP tool registration:

```typescript
// In MCP plugin setup
for (const [name, command] of ctx.subCommands) {
  if (isLazyCommand(command)) {
    // Metadata available immediately for tool registration
    const zodSchema = gunshiArgsToZod(command.args ?? {})
    
    server.registerTool(name, {
      title: command.name ?? name,
      description: command.description ?? '',
      inputSchema: zodSchema
    }, async (args) => {
      // Loader called here - first MCP invocation loads the implementation
      const runner = await command.load()
      const ctx = buildCommandContext(command, args, extensions)
      return captureOutput(() => runner(ctx))
    })
  }
}
```

### Performance Benefits

| Scenario | Without Lazy | With Lazy |
|----------|--------------|-----------|
| `mycli --help` | Loads all commands | Loads only metadata |
| `mycli deploy --help` | Loads all commands | Loads only deploy metadata |
| `mycli deploy` | Loads all commands | Loads only deploy implementation |
| 50 commands, run 1 | 50 modules loaded | 1 module loaded |

### When to Use Lazy Commands

✅ **Use lazy when:**
- Commands have heavy dependencies
- Many commands exist (>10)
- Startup time matters
- Commands are rarely all used together

❌ **Skip lazy when:**
- Few simple commands
- All commands share same dependencies
- Build step can tree-shake unused code

## Open Questions

1. **Nested subcommands**: How to name tools for `app deploy staging`? Use `app-deploy-staging` or `app.deploy.staging`?
2. **Extension availability**: Should all extensions be available, or only declared dependencies?
3. **Error handling**: Map Gunshi errors to MCP error format?
4. **Output format**: Always text, or detect structured output (JSON)?
