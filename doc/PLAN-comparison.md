# PLAN-comparison.md: Gunshi ↔ MCP Integration Comparison

This document compares the two integration approaches and provides recommendations.

## Executive Summary

| Aspect | Gunshi → MCP | MCP → Gunshi |
|--------|--------------|--------------|
| **Primary audience** | Existing CLI developers | AI-first tool developers |
| **Schema definition** | Gunshi args | Zod schemas |
| **Type richness** | Limited (string, number, boolean, positional, custom) | Full Zod expressiveness |
| **Conversion direction** | Gunshi args → Zod | Zod → Gunshi args |
| **Conversion fidelity** | High (Gunshi is simpler) | Medium (lossy for complex types) |
| **Extension access** | Native | Via ToolContext wrapper |
| **Structured output** | Requires detection | First-class |
| **CLI ergonomics** | Native (short flags, positional) | Requires `cli` overrides |

## Detailed Comparison

### Schema Definition

**Gunshi → MCP**
```typescript
args: {
  env: { type: 'string', required: true, short: 'e' },
  force: { type: 'boolean', short: 'f' },
  config: { type: 'custom', parse: v => JSON.parse(v) }
}
```

**MCP → Gunshi**
```typescript
inputSchema: {
  env: z.string(),
  force: z.boolean().optional(),
  config: z.object({ key: z.string() })
}
```

**Winner**: MCP → Gunshi for type expressiveness. Zod supports unions, intersections, refinements, transforms, and nested structures. Gunshi args are intentionally simple.

### Conversion Fidelity

**Gunshi → MCP**: ✅ High fidelity
- All Gunshi types map cleanly to Zod
- `positional` becomes optional string (slight semantic loss)
- `custom` becomes string with runtime parsing

**MCP → Gunshi**: ⚠️ Medium fidelity
- Complex types (arrays, objects) require custom parsers
- Enum values not enforced at CLI level
- Unions and intersections have no CLI equivalent
- Short flags require manual `cli.args` overrides

### Extension Access

**Gunshi → MCP**: Native
```typescript
run: ctx => {
  ctx.extensions[loggerId].log('message')
}
```

**MCP → Gunshi**: Via wrapper
```typescript
handler: async (args, ctx) => {
  ctx.extensions[loggerId].log('message')
}
```

Both approaches provide full extension access. The Gunshi approach is more direct since commands already receive `ctx`. The MCP approach requires a `ToolContext` wrapper to pass extensions to handlers.

### Output Handling

**Gunshi → MCP**: Requires conversion
```typescript
// Gunshi commands typically console.log
run: ctx => {
  console.log(`Deployed to ${ctx.values.env}`)
}

// Must capture stdout and wrap in MCP format
{ content: [{ type: 'text', text: capturedOutput }] }
```

**MCP → Gunshi**: Native structured output
```typescript
handler: async (args) => ({
  content: [{ type: 'text', text: 'Deployed' }],
  structuredContent: { success: true, env: args.env }
})

// CLI extracts text, can also format structuredContent
```

**Winner**: MCP → Gunshi. Tools return structured data that can be formatted for CLI or passed through for MCP. No output capture hacks needed.

### CLI Ergonomics

**Gunshi → MCP**: ✅ Native CLI design
- Short flags (`-f`, `-e`)
- Positional arguments
- Help generation
- Validation messages

**MCP → Gunshi**: ⚠️ Requires overrides
```typescript
cli: {
  args: {
    path: { type: 'positional' },
    force: { short: 'f' }
  }
}
```

**Winner**: Gunshi → MCP for CLI-focused tools. Authors already think in CLI terms.

### Implementation Complexity

**Gunshi → MCP**
- Schema conversion: Simple (5 type mappings)
- Output capture: Complex (stdout interception)
- Context building: Simple (pass through)
- Registration: Simple (iterate subCommands)

**MCP → Gunshi**
- Schema conversion: Complex (Zod introspection, many type variants)
- Output handling: Simple (extract text from result)
- Context building: Medium (wrap extensions)
- Registration: Simple (iterate tools array)

**Winner**: Tie. Different tradeoffs. Gunshi → MCP has simpler schema conversion but harder output capture. MCP → Gunshi has harder schema conversion but cleaner output handling.

## Recommendation: Unified Approach

Rather than choosing one direction, implement **bidirectional support** with a shared core:

```
┌─────────────────────────────────────────────────────────────┐
│                     Unified Definition                       │
├─────────────────────────────────────────────────────────────┤
│  defineCommand() ─────────────┐                              │
│  (Gunshi-style args)          │                              │
│                               ▼                              │
│                    ┌──────────────────┐                      │
│                    │  Internal Model  │                      │
│                    │  - name          │                      │
│                    │  - description   │                      │
│                    │  - schema (Zod)  │                      │
│                    │  - handler       │                      │
│                    │  - cliOverrides  │                      │
│                    └──────────────────┘                      │
│                               ▲                              │
│  defineTool() ────────────────┘                              │
│  (Zod inputSchema)                                           │
└─────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │   MCP Server     │              │   Gunshi CLI     │
    │   registerTool() │              │   addCommand()   │
    └──────────────────┘              └──────────────────┘
```

### Internal Model

```typescript
interface UnifiedDefinition<TSchema, TExtensions> {
  name: string
  description: string
  
  // Canonical schema (Zod)
  schema: z.ZodObject<TSchema>
  
  // Handler receives typed args + extensions
  handler: (
    args: z.infer<z.ZodObject<TSchema>>,
    ctx: { extensions: TExtensions }
  ) => Promise<HandlerResult>
  
  // CLI-specific configuration
  cli?: {
    positional?: (keyof TSchema)[]
    shorts?: Partial<Record<keyof TSchema, string>>
    hidden?: (keyof TSchema)[]
  }
  
  // MCP-specific configuration
  mcp?: {
    title?: string
    annotations?: Record<string, unknown>
    outputSchema?: z.ZodRawShape
  }
}
```

### Unified Handler Result

```typescript
interface HandlerResult {
  // For MCP
  content: Array<{ type: 'text', text: string } | { type: 'image', ... }>
  structuredContent?: unknown
  
  // For CLI (optional, falls back to content text)
  exitCode?: number
}
```

### Entry Points

**For CLI developers (Gunshi-style)**
```typescript
import { defineCommand } from 'gunshi-mcp'

export const deploy = defineCommand({
  name: 'deploy',
  args: {
    env: { type: 'string', required: true, short: 'e' },
    force: { type: 'boolean', short: 'f' }
  },
  run: async (args, ctx) => {
    ctx.extensions[loggerId].log(`Deploying to ${args.env}`)
    return { text: 'Deployed successfully' }
  }
})
```

**For AI-first developers (MCP-style)**
```typescript
import { defineTool } from 'gunshi-mcp'

export const deploy = defineTool({
  name: 'deploy',
  inputSchema: {
    env: z.string().describe('Target environment'),
    force: z.boolean().optional()
  },
  cli: { shorts: { env: 'e', force: 'f' } },
  handler: async (args, ctx) => {
    ctx.extensions[loggerId].log(`Deploying to ${args.env}`)
    return { 
      content: [{ type: 'text', text: 'Deployed successfully' }],
      structuredContent: { success: true }
    }
  }
})
```

Both produce the same internal model and can be used interchangeably.

## Implementation Priority

### Phase 1: MCP → Gunshi (Recommended First)

**Rationale**:
1. MCP is the "harder" direction (Zod introspection)
2. Solving MCP first means Zod is the canonical schema
3. Gunshi args can be generated from Zod
4. Output format is cleaner (structured first)
5. AI-first aligns with MCP's purpose

**Deliverables**:
- `defineTool()` API
- Zod → Gunshi args conversion
- Dual registration in plugin
- ToolContext with extensions

### Phase 2: Gunshi → MCP

**Rationale**:
1. Simpler conversion (Gunshi → Zod)
2. Supports existing Gunshi command libraries
3. Output capture is trickier but solvable

**Deliverables**:
- Auto-discovery of `ctx.subCommands`
- Gunshi args → Zod conversion
- Output capture utility
- `defineCommand()` wrapper (optional)

### Phase 3: Unified API

**Rationale**:
1. Single mental model
2. Authors pick their preferred style
3. Internal model is canonical

**Deliverables**:
- Internal unified model
- Both entry points produce same model
- Shared handler result type
- Documentation for both styles

## Decision Matrix

| If you... | Use... |
|-----------|--------|
| Have existing Gunshi commands | PLAN-gunshi (auto-expose as MCP) |
| Are starting fresh, AI-first | PLAN-mcp (defineTool) |
| Need complex validation | PLAN-mcp (Zod expressiveness) |
| Need great CLI UX | PLAN-gunshi (native args) |
| Want structured output | PLAN-mcp (first-class) |
| Want both equally | Unified approach (Phase 3) |

## Files Structure (Unified)

```
src/
├── types.ts              # Shared types, plugin ID
├── plugin.ts             # Main plugin with dual registration
├── schema/
│   ├── zod-to-gunshi.ts  # Zod → Gunshi args
│   └── gunshi-to-zod.ts  # Gunshi args → Zod
├── define/
│   ├── tool.ts           # defineTool() (MCP-style)
│   └── command.ts        # defineCommand() (Gunshi-style)
├── context.ts            # ToolContext builder
├── output.ts             # Result formatting
└── capture.ts            # Output capture (for Gunshi commands)
```

## Open Questions (Both Approaches)

1. **Streaming**: Neither plan addresses streaming output well
2. **Subcommands**: How to represent `app deploy staging` as tools?
3. **Interactive**: How to handle prompts/confirmations?
4. **Resources**: MCP has resources; Gunshi doesn't—bridge?
5. **Prompts**: MCP prompts vs CLI usage—unified story?

## Conclusion

**Start with MCP → Gunshi (PLAN-mcp)** because:
1. Zod as canonical schema is more expressive
2. Structured output is cleaner
3. AI-first aligns with project goals
4. Gunshi arg generation is deterministic

Then add **Gunshi → MCP (PLAN-gunshi)** for:
1. Backward compatibility with existing commands
2. CLI developers who think in args first

Finally, create a **unified API** that accepts either style and produces the same internal representation.
