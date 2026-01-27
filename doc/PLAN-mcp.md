# PLAN-mcp.md: MCP → Gunshi Integration

> **Goal**: Authors write MCP tools, and they automatically work as Gunshi CLI commands.

## Core Concept

MCP tools use Zod schemas for input validation. Gunshi commands use arg definitions. The bridge converts Zod schemas to Gunshi arg definitions and wraps tool execution as CLI commands, while preserving access to the full Gunshi extension ecosystem.

## Plugin Identity

```typescript
// src/types.ts
export const MCP_PLUGIN_ID = "gunshi-mcp:mcp" as const
export type McpPluginId = typeof MCP_PLUGIN_ID

export interface McpExtension {
  readonly server: McpServer
  startServer: (options?: { port?: number }) => Promise<void>
  stopServer: () => Promise<void>
}

// Tool context passed to handlers
export interface ToolContext<E = {}> {
  extensions: E
  log: LoggerExtension
  // MCP-specific context
  meta: { requestId?: string }
}
```

## MCP Tool Definition

```typescript
import { defineTool } from 'gunshi-mcp'
import { z } from 'zod'
import { loggerId, LoggerExtension } from './plugins/logger/types.js'
import { configId, ConfigExtension } from './plugins/config/types.js'

export const deployTool = defineTool<{
  extensions:
    & Record<typeof loggerId, LoggerExtension>
    & Record<typeof configId, ConfigExtension>
}>({
  name: 'deploy',
  title: 'Deploy Application',
  description: 'Deploy to target environment',

  inputSchema: {
    env: z.string().describe('Target environment'),
    force: z.boolean().optional().describe('Force deployment'),
    replicas: z.number().default(1)
  },

  handler: async (args, ctx) => {
    // Full access to Gunshi extensions
    ctx.extensions[loggerId].log(`Deploying to ${args.env}`)
    const config = ctx.extensions[configId].get('deploy')

    return {
      content: [{ type: 'text', text: `Deployed to ${args.env}` }],
      structuredContent: { success: true, env: args.env }
    }
  }
})
```

## Gunshi Command (Auto-Generated)

```typescript
const command = {
  name: 'deploy',
  description: 'Deploy to target environment',
  args: {
    env: { type: 'string', required: true, description: 'Target environment' },
    force: { type: 'boolean', description: 'Force deployment' },
    replicas: { type: 'number', default: 1 }
  },
  run: async ctx => {
    const toolCtx = buildToolContext(ctx.extensions)
    const result = await deployTool.handler(ctx.values, toolCtx)
    console.log(extractText(result))
  }
}
```

## Type Mapping: Zod Schema → Gunshi Args

| Zod Type        | Gunshi `type`     | Notes                  |
| --------------- | ----------------- | ---------------------- |
| `z.string()`    | `string`          |                        |
| `z.boolean()`   | `boolean`         |                        |
| `z.number()`    | `number`          |                        |
| `z.enum([...])` | `string`          | Could add validation   |
| `z.array(...)`  | `custom`          | Accept comma-separated |
| `z.object(...)` | `custom`          | Accept JSON string     |
| `.optional()`   | `required: false` |                        |
| `.default(X)`   | `default: X`      |                        |
| `.describe(Y)`  | `description: Y`  |                        |

## Implementation Phases

### Phase 1: Tool Definition API

```typescript
// src/define-tool.ts
import { z } from 'zod'

export interface ToolDefinition<
  TSchema extends z.ZodRawShape = z.ZodRawShape,
  TExtensions = {}
> {
  name: string
  title?: string
  description: string
  inputSchema: TSchema
  outputSchema?: z.ZodRawShape

  // CLI-specific overrides
  cli?: {
    args?: Partial<Record<keyof TSchema, Partial<GunshiArg>>>
  }

  handler: (
    args: z.infer<z.ZodObject<TSchema>>,
    ctx: ToolContext<TExtensions>
  ) => Promise<ToolResult>
}

export function defineTool<TExtensions = {}>() {
  return <TSchema extends z.ZodRawShape>(
    definition: ToolDefinition<TSchema, TExtensions>
  ): ToolDefinition<TSchema, TExtensions> => definition
}

// Usage with type inference
export const myTool = defineTool<{
  extensions: Record<typeof loggerId, LoggerExtension>
}>()({
  name: 'my-tool',
  description: 'Does something',
  inputSchema: { input: z.string() },
  handler: async (args, ctx) => {
    ctx.extensions[loggerId].log(args.input)
    return { content: [{ type: 'text', text: 'done' }] }
  }
})
```

### Phase 2: Schema Introspection

```typescript
// src/zod-to-gunshi.ts
import { z } from 'zod'

interface ZodFieldInfo {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
  required: boolean
  default?: unknown
  description?: string
  enumValues?: string[]
}

function introspectZodField(schema: z.ZodTypeAny): ZodFieldInfo {
  let inner = schema
  let required = true
  let defaultValue: unknown
  let description = schema.description

  // Unwrap ZodOptional
  if (inner._def.typeName === 'ZodOptional') {
    required = false
    inner = inner._def.innerType
  }

  // Unwrap ZodDefault
  if (inner._def.typeName === 'ZodDefault') {
    defaultValue = inner._def.defaultValue()
    inner = inner._def.innerType
  }

  // Get description from inner type if not set
  description = description ?? inner.description

  // Determine base type
  const typeName = inner._def.typeName
  switch (typeName) {
    case 'ZodString':
      return { type: 'string', required, default: defaultValue, description }
    case 'ZodNumber':
      return { type: 'number', required, default: defaultValue, description }
    case 'ZodBoolean':
      return { type: 'boolean', required, default: defaultValue, description }
    case 'ZodEnum':
      return {
        type: 'enum',
        required,
        default: defaultValue,
        description,
        enumValues: inner._def.values
      }
    case 'ZodArray':
      return { type: 'array', required, default: defaultValue, description }
    case 'ZodObject':
      return { type: 'object', required, default: defaultValue, description }
    default:
      return { type: 'string', required, default: defaultValue, description }
  }
}

export function zodSchemaToGunshiArgs(
  schema: z.ZodRawShape,
  overrides?: Record<string, Partial<GunshiArg>>
): Record<string, GunshiArg> {
  const args: Record<string, GunshiArg> = {}

  for (const [name, field] of Object.entries(schema)) {
    const info = introspectZodField(field)
    const override = overrides?.[name] ?? {}

    const arg: GunshiArg = {
      type: override.type ?? (
        info.type === 'enum' ? 'string' :
        info.type === 'array' ? 'custom' :
        info.type === 'object' ? 'custom' :
        info.type
      ),
      description: override.description ?? info.description,
      short: override.short,
      required: override.required ?? info.required,
      default: override.default ?? info.default
    }

    // Add custom parser for complex types
    if (info.type === 'array' && !override.parse) {
      arg.parse = (v: string) => v.split(',').map(s => s.trim())
    } else if (info.type === 'object' && !override.parse) {
      arg.parse = (v: string) => JSON.parse(v)
    }

    if (override.parse) {
      arg.parse = override.parse
    }

    args[name] = arg
  }

  return args
}
```

### Phase 3: Plugin with Dual Registration

```typescript
// src/plugin.ts
import { plugin } from "gunshi/plugin"
import { MCP_PLUGIN_ID, McpExtension, ToolDefinition } from "./types.js"
import { loggerId, LoggerExtension } from "./plugins/logger/types.js"

export interface McpPluginOptions {
  tools?: ToolDefinition[]
  name?: string
  version?: string
}

export default function createMcpPlugin(options: McpPluginOptions = {}) {
  return plugin<
    { [K in typeof loggerId]: LoggerExtension },
    typeof MCP_PLUGIN_ID,
    [typeof loggerId],
    McpExtension
  >({
    id: MCP_PLUGIN_ID,
    name: "MCP Plugin",
    dependencies: [loggerId],

    setup: async (ctx) => {
      const logger = ctx.extensions[loggerId]

      const server = new McpServer({
        name: options.name ?? "gunshi-mcp",
        version: options.version ?? "1.0.0"
      })
      ctx.data.set("mcp:server", server)

      // Register each tool as both MCP tool and Gunshi command
      for (const tool of options.tools ?? []) {
        // Register as MCP tool
        server.registerTool(tool.name, {
          title: tool.title ?? tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema
        }, async (args, extra) => {
          const toolCtx = buildToolContext(ctx.extensions, extra)
          return tool.handler(args, toolCtx)
        })

        // Register as Gunshi command
        ctx.addCommand(tool.name, {
          name: tool.name,
          description: tool.description,
          args: zodSchemaToGunshiArgs(tool.inputSchema, tool.cli?.args),
          run: async (cmdCtx) => {
            const toolCtx = buildToolContext(ctx.extensions)
            const result = await tool.handler(cmdCtx.values, toolCtx)
            console.log(formatResult(result, cmdCtx.values.format))
          }
        })

        logger.debug(`[mcp] Registered tool: ${tool.name}`)
      }
    },

    // Command decorator for telemetry
    decorateCommand: (baseRunner) => async (context) => {
      const logger = ctx.extensions[loggerId]
      const start = Date.now()

      try {
        const result = await baseRunner(context)
        logger.debug(`[mcp] ${context.name} completed in ${Date.now() - start}ms`)
        return result
      } catch (error) {
        logger.error(`[mcp] ${context.name} failed: ${error}`)
        throw error
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
        startServer: async (opts) => {
          const transport = new StdioServerTransport()
          await server.connect(transport)
        },
        stopServer: async () => {
          await server.close()
        }
      }
    }
  })
}
```

### Phase 4: Tool Context Builder

```typescript
// src/context.ts
export function buildToolContext<E>(
  extensions: E,
  mcpExtra?: McpToolExtra
): ToolContext<E> {
  return {
    extensions,
    log: extensions[loggerId] as LoggerExtension,
    meta: {
      requestId: mcpExtra?.requestId
    }
  }
}
```

### Phase 5: Output Formatting

```typescript
// src/output.ts
export function extractText(result: ToolResult): string {
  return result.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
}

export function formatResult(
  result: ToolResult,
  format?: 'text' | 'json'
): string {
  if (format === 'json' && result.structuredContent) {
    return JSON.stringify(result.structuredContent, null, 2)
  }
  return extractText(result)
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Tool Definition                    │
├─────────────────────────────────────────────────────┤
│  defineTool<{ extensions: ... }>()({                │
│    name: 'deploy',                                  │
│    inputSchema: { env: z.string() },                │
│    handler: async (args, ctx) => {                  │
│      ctx.extensions[loggerId].log(...)              │
│      return { content: [...] }                      │
│    }                                                │
│  })                                                 │
└───────────────────────┬─────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────┐
│      MCP Server     │    │    Gunshi CLI           │
├─────────────────────┤    ├─────────────────────────┤
│  server.registerTool│    │  ctx.addCommand()       │
│  inputSchema as-is  │    │  zodSchemaToGunshiArgs  │
│                     │    │                         │
│  handler receives:  │    │  run receives:          │
│  - args (validated) │    │  - ctx.values           │
│  - toolCtx with     │    │  - toolCtx with         │
│    extensions       │    │    extensions           │
└─────────────────────┘    └─────────────────────────┘
         │                             │
         ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  MCP Client calls   │    │  CLI invocation         │
│  tool('deploy',     │    │  $ app deploy --env prod│
│    { env: 'prod' }) │    │                         │
└─────────────────────┘    └─────────────────────────┘
```

## Tool Discovery Pattern

For projects with many tools, use auto-discovery:

```typescript
// tools/index.ts
export { deployTool } from './deploy.js'
export { buildTool } from './build.js'
export { testTool } from './test.js'

// In app setup
import * as tools from './tools/index.js'

const allTools = Object.values(tools).filter(
  (t): t is ToolDefinition => t && typeof t === 'object' && 'handler' in t
)

app.use(createMcpPlugin({ tools: allTools }))
```

## Extension Ecosystem Integration

Tools have full access to all registered plugin extensions:

```typescript
import { defineTool } from 'gunshi-mcp'
import { loggerId, LoggerExtension } from './plugins/logger/types.js'
import { configId, ConfigExtension } from './plugins/config/types.js'
import { cacheId, CacheExtension } from './plugins/cache/types.js'

export const backupTool = defineTool<{
  extensions:
    & Record<typeof loggerId, LoggerExtension>
    & Record<typeof configId, ConfigExtension>
    & Record<typeof cacheId, CacheExtension>
}>()({
  name: 'backup',
  description: 'Backup data',

  inputSchema: {
    path: z.string().describe('Backup path')
  },

  handler: async (args, ctx) => {
    const logger = ctx.extensions[loggerId]
    const config = ctx.extensions[configId]
    const cache = ctx.extensions[cacheId]

    logger.log('Starting backup...')
    const dest = config.get('backup.destination')
    await cache.set('lastBackup', Date.now())

    return {
      content: [{ type: 'text', text: `Backed up to ${dest}` }]
    }
  }
})
```

## Files to Create/Modify

| File                   | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `src/types.ts`         | Plugin ID, extension interface, ToolContext |
| `src/define-tool.ts`   | `defineTool()` API                          |
| `src/zod-to-gunshi.ts` | Schema conversion                           |
| `src/context.ts`       | Tool context builder                        |
| `src/output.ts`        | Result formatting                           |
| `src/plugin.ts`        | Plugin with dual registration               |

## Limitations

1. **Zod introspection**: Extracting metadata requires Zod internal API access
2. **Complex schemas**: Nested objects/arrays harder to represent in CLI
3. **Result format**: MCP's rich content (images, embeds) has no CLI equivalent
4. **Error handling**: MCP errors need CLI-friendly formatting
5. **Short flags**: Must be manually configured via `cli.args` overrides

## Advantages

1. **MCP-first**: Design for AI from the start
2. **Rich types**: Zod's full expressiveness for validation
3. **Structured output**: First-class support for structured results
4. **Extension access**: Full Gunshi plugin ecosystem available
5. **Dual exposure**: Same logic accessible via CLI and MCP
6. **Type safety**: Full TypeScript inference for handlers

## Example: Full Tool Definition

```typescript
import { defineTool } from 'gunshi-mcp'
import { z } from 'zod'
import { loggerId, LoggerExtension } from './plugins/logger/types.js'

export const analyzeCodeTool = defineTool<{
  extensions: Record<typeof loggerId, LoggerExtension>
}>()({
  name: 'analyze-code',
  title: 'Code Analyzer',
  description: 'Analyze source code for issues',

  inputSchema: {
    path: z.string().describe('Path to analyze'),
    rules: z.array(z.string()).optional().describe('Rule IDs to check'),
    format: z.enum(['text', 'json', 'sarif']).default('text'),
    fix: z.boolean().optional().describe('Auto-fix issues')
  },

  outputSchema: {
    issues: z.array(z.object({
      file: z.string(),
      line: z.number(),
      message: z.string()
    })),
    count: z.number()
  },

  // CLI-specific overrides
  cli: {
    args: {
      path: { type: 'positional' },
      rules: { short: 'r' },
      format: { short: 'f' },
      fix: { short: 'F' }
    }
  },

  handler: async ({ path, rules, format, fix }, ctx) => {
    ctx.extensions[loggerId].log(`Analyzing ${path}...`)

    const issues = await analyze(path, { rules, fix })
    const output = { issues, count: issues.length }

    return {
      content: [{ type: 'text', text: formatIssues(issues, format) }],
      structuredContent: output
    }
  }
})
```

## Open Questions

1. **Streaming**: How to handle long-running tools that stream output?
2. **Validation timing**: Validate at Zod level or Gunshi level?
3. **Subcommand grouping**: Group related tools under a parent command?
4. **Plugin dependencies**: How to declare tool dependencies on specific plugins?
