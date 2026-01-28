# Nested Object Support

Planning document for supporting nested objects in tool definitions.

## Problem Statement

Currently, nested `z.object()` schemas:
1. Produce incomplete JSON Schema (`{ type: "object" }` with no `properties`)
2. Have no CLI flag mapping strategy

We need both MCP and CLI paths to handle nested structures correctly.

## Proposed Solution: Flattened CLI Flags

Map nested object keys to hyphenated flag names:

```ts
input: z.object({
  foo: z.object({
    bar: z.number(),
    baz: z.string(),
  }),
  top: z.boolean(),
})
```

Produces CLI flags:
```
--foo-bar <number>
--foo-baz <string>
--top
```

And JSON Schema:
```json
{
  "type": "object",
  "properties": {
    "foo": {
      "type": "object",
      "properties": {
        "bar": { "type": "number" },
        "baz": { "type": "string" }
      },
      "required": ["bar", "baz"]
    },
    "top": { "type": "boolean" }
  }
}
```

## Design Decisions

### 1. Separator Character

| Option | Example | Pros | Cons |
|--------|---------|------|------|
| Hyphen `-` | `--foo-bar` | Standard CLI convention | Ambiguous if keys contain hyphens |
| Dot `.` | `--foo.bar` | Clear hierarchy | Unusual for CLI, shell quoting issues |
| Colon `:` | `--foo:bar` | Clear hierarchy | Unusual for CLI |
| Underscore `_` | `--foo_bar` | No ambiguity | Less readable |

**Recommendation**: Use hyphen `-` as default (most natural for CLI), but:
- Escape/reject keys that contain hyphens themselves
- Or allow configurable separator via `cli.separator` option

### 2. Depth Limit

Unbounded nesting creates unwieldy flags: `--a-b-c-d-e-f`

**Recommendation**: 
- Default max depth of 3 levels
- Configurable via `cli.maxDepth`
- Beyond limit, use JSON string input: `--deeply-nested '{"x":{"y":1}}'`

### 3. Key Collision Detection

Flattening can create collisions:

```ts
z.object({
  foo: z.object({ bar: z.string() }),
  "foo-bar": z.string(),  // Collision!
})
```

Both map to `--foo-bar`.

**Recommendation**: 
- Detect at tool registration time
- Throw descriptive error with both paths
- Suggest renaming or using `cli.args` override

### 4. Optional Nested Objects

How does optionality propagate?

```ts
z.object({
  config: z.object({
    timeout: z.number(),
  }).optional(),
})
```

Options:
- A) All nested flags become optional
- B) Parent optionality doesn't affect children (confusing)
- C) If any nested flag provided, validate all required children

**Recommendation**: Option A—if parent is optional, all children are optional.

### 5. Default Values for Nested Objects

```ts
z.object({
  config: z.object({
    timeout: z.number(),
  }).default({ timeout: 30 }),
})
```

**Recommendation**: 
- Extract defaults from parent default object
- `--config-timeout` defaults to `30`
- Document that nested defaults must be complete objects

### 6. Reconstruction at Parse Time

CLI values come in flat; handler expects nested structure.

Input: `{ "config-timeout": 30, "config-retries": 3 }`
Handler expects: `{ config: { timeout: 30, retries: 3 } }`

**Recommendation**: Add reconstruction step before Zod parse:

```ts
function reconstructNested(
  flatValues: Record<string, unknown>,
  schema: z.ZodObject<any>,
  separator = "-"
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  for (const [flatKey, value] of Object.entries(flatValues)) {
    const parts = flatKey.split(separator)
    let target = result
    for (let i = 0; i < parts.length - 1; i++) {
      target[parts[i]] ??= {}
      target = target[parts[i]] as Record<string, unknown>
    }
    target[parts[parts.length - 1]] = value
  }
  
  return result
}
```

## Implementation Plan

### Phase 1: JSON Schema (MCP path)

Recursive conversion in `zodToJsonSchema`:

```ts
function zodToJsonSchema<const Shape extends ZodShape>(
  schema: z.ZodObject<Shape>,
  depth = 0,
  maxDepth = 10,
): object {
  if (depth > maxDepth) {
    throw new Error(`Schema nesting exceeds max depth ${maxDepth}`)
  }
  
  const properties: Record<string, object> = {}
  const required: string[] = []

  for (const name in schema.shape) {
    const field = schema.shape[name]
    const info = introspectZodField(field)

    if (info.type === "object" && isZodObject(field)) {
      // Recursively convert nested object
      const innerSchema = unwrapZodType(field)
      properties[name] = {
        ...zodToJsonSchema(innerSchema, depth + 1, maxDepth),
        ...(info.description && { description: info.description }),
      }
    } else {
      properties[name] = buildPropertySchema(info)
    }

    if (info.required) required.push(name)
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties: false,
  }
}
```

### Phase 2: CLI Flag Generation

Flatten schema to Gunshi args:

```ts
interface FlattenOptions {
  separator?: string
  maxDepth?: number
  prefix?: string
}

function flattenSchemaToGunshiArgs(
  schema: z.ZodObject<any>,
  overrides?: Record<string, Partial<GunshiArg>>,
  options: FlattenOptions = {},
): Record<string, GunshiArg> {
  const { separator = "-", maxDepth = 3, prefix = "" } = options
  const args: Record<string, GunshiArg> = {}
  const collisions = new Map<string, string[]>()

  function walk(
    shape: z.ZodRawShape,
    currentPrefix: string,
    depth: number,
    parentOptional: boolean,
  ) {
    for (const [key, field] of Object.entries(shape)) {
      const flatKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key
      const info = introspectZodField(field)
      const isOptional = parentOptional || !info.required

      if (info.type === "object" && isZodObject(field)) {
        if (depth >= maxDepth) {
          // Beyond max depth, use JSON string input
          args[flatKey] = {
            type: "custom",
            description: info.description,
            required: isOptional ? undefined : true,
            parse: (v: string) => JSON.parse(v),
          }
        } else {
          const innerSchema = unwrapZodType(field)
          walk(innerSchema.shape, flatKey, depth + 1, isOptional)
        }
      } else {
        // Check for collision
        if (args[flatKey]) {
          const existing = collisions.get(flatKey) || [flatKey]
          existing.push(`${currentPrefix}.${key}`)
          collisions.set(flatKey, existing)
        }
        
        args[flatKey] = buildGunshiArg(info, overrides?.[flatKey], isOptional)
      }
    }
  }

  walk(schema.shape, prefix, 0, false)

  // Report collisions
  if (collisions.size > 0) {
    const details = [...collisions.entries()]
      .map(([key, paths]) => `  ${key}: ${paths.join(", ")}`)
      .join("\n")
    throw new Error(`CLI flag collisions detected:\n${details}`)
  }

  return args
}
```

### Phase 3: Value Reconstruction

Before calling Zod parse, unflatten CLI values:

```ts
// In mcp-plugin.ts CLI path
const flatValues = cmdCtx.values
const nestedValues = reconstructNested(flatValues, tool.input, separator)
const parsed = tool.input.parse(nestedValues)
```

### Phase 4: CLI Override Syntax

Allow overrides to target nested fields:

```ts
defineTool()({
  input: z.object({
    config: z.object({
      timeout: z.number(),
    }),
  }),
  cli: {
    args: {
      "config-timeout": {  // Flat key
        short: "t",
        description: "Request timeout in ms",
      },
    },
  },
})
```

## Edge Cases

### Arrays of Objects

```ts
z.object({
  servers: z.array(z.object({
    host: z.string(),
    port: z.number(),
  })),
})
```

**Recommendation**: Use JSON string for array-of-objects:
```
--servers '[{"host":"a","port":1},{"host":"b","port":2}]'
```

Or repeated flags with index (complex, maybe later):
```
--servers-0-host a --servers-0-port 1 --servers-1-host b --servers-1-port 2
```

### Discriminated Unions

```ts
z.object({
  auth: z.discriminatedUnion("type", [
    z.object({ type: z.literal("basic"), user: z.string(), pass: z.string() }),
    z.object({ type: z.literal("token"), token: z.string() }),
  ]),
})
```

**Recommendation**: Use JSON string for unions. Too complex for flat flags.

### Nullable vs Optional

```ts
z.object({
  value: z.string().nullable(),  // Can be null
  other: z.string().optional(),  // Can be undefined
})
```

**Recommendation**: 
- Both treated as "not required" for CLI
- Nullable allows explicit `--value null` 
- Optional is simply omittable

## Configuration API

```ts
interface CliConfig {
  separator?: string        // Default: "-"
  maxDepth?: number         // Default: 3
  arrayHandling?: "json" | "indexed" | "repeated"  // Default: "json"
}

defineTool()({
  input: z.object({ ... }),
  cli: {
    separator: ".",
    maxDepth: 2,
    args: { ... },
  },
})
```

## Testing Strategy

1. **Unit tests for flattening**:
   - Simple nested object
   - Multiple levels
   - Optional parents
   - Default values
   - Collision detection

2. **Unit tests for reconstruction**:
   - Flat values → nested structure
   - Missing optional fields
   - Type coercion

3. **Integration tests**:
   - CLI invocation with nested flags
   - MCP call with nested JSON
   - Both produce same handler args

4. **Error case tests**:
   - Collision throws
   - Max depth exceeded
   - Invalid JSON in deep-nested string

## Migration

Existing tools using flat schemas: no change required.

New tools with nested schemas: 
- CLI automatically gets flattened flags
- MCP automatically gets proper JSON Schema
- Handler receives reconstructed nested objects

## Open Questions

1. Should we support `z.record()` (dynamic keys)?
   - Probably not for CLI; use JSON string
   
2. Should flattening be opt-in?
   - Default to flatten, allow `cli: { flatten: false }` to require JSON

3. How to handle descriptions for nested parents?
   - Show in `--help` as section header?
   - `Config options:` followed by `--config-timeout`, `--config-retries`
