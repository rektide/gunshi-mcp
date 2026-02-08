# builder prompt

we want to build a nice builder pattern to compose the gunshi plugins we have recently built. this will require first understanding the problem, and evaluating the work done and the current state of the gunshi plugins we have recently built. look at the beads ticket gunshi-mcp-plugin-arch , which is the epic. read the relevant documentation, especially library.md. read the builder ticket to understand the goal we are trying to achieve. get details on the individual gunshi plugins we have implemented, by reading the beads tickets, reading the commit message, and looking directly at the work output / files created or changed. for example, the cli plugin gunshi-mcp-cli-plugin and how it was implemented. implement the builder pattern.

---

# Builder Pattern Design Document

## Overview

The builder provides a fluent API for assembling gunshi-mcp plugins. It's syntactic sugar over direct plugin factory calls, handling dependency ordering and auto-inclusion of required plugins.

## Implementation

### File Structure

```
src/builder.ts          # Builder implementation
test/builder.test.ts    # 17 unit tests
```

### API

```typescript
import { gunshiMcp } from "gunshi-mcp"

const plugins = await gunshiMcp()
  .withLogging()
  .withDiscovery()
  .withRegistry()
  .withServer()
  .withCli()
  .build()

// Use with gunshi cli()
await cli(args, command, { plugins })
```

### Plugin Methods

| Method                 | Options Type              | Auto-includes   |
| ---------------------- | ------------------------- | --------------- |
| `withLogging(opts?)`   | `LoggingPluginOptions`    | -               |
| `withSchema(opts?)`    | `SchemaPluginOptions`     | -               |
| `withRegistry(opts?)`  | `RegistryPluginOptions`   | -               |
| `withDiscovery(opts?)` | `DiscoveryPluginOptions`  | -               |
| `withServer(opts?)`    | `ServerPluginOptions`     | -               |
| `withCli(opts?)`       | `CliPluginOptions`        | schema          |
| `withOpenCode(opts?)`  | `Record<string, unknown>` | - (placeholder) |

### Key Design Decisions

#### 1. Async build()

`build()` is async to allow dynamic imports of plugin factories. This keeps the builder module lightweight - plugins are only loaded when actually used.

```typescript
async build(): Promise<Plugin[]> {
  if (this.config.logging) {
    const { default: createLoggingPlugin } = await import("./plugins/logger.ts")
    plugins.push(createLoggingPlugin(...))
  }
  // ...
}
```

#### 2. Auto-inclusion of Schema Plugin

When CLI plugin is added, schema plugin is automatically included (CLI depends on schema for Zod→GunshiArg conversion). The builder checks if schema is already explicitly added to avoid duplication.

```typescript
const needsSchema = this.config.cli || this.config.schema
if (needsSchema) {
  // Add schema plugin once
}
```

#### 3. Dependency-ordered Output

Plugins are added to the array in dependency order:

1. logging (no deps)
2. discovery (no deps)
3. registry (optional dep on discovery)
4. schema (no deps)
5. server (optional dep on registry)
6. cli (deps on schema, registry)

This ordering is hardcoded in `build()` rather than computed from plugin metadata.

#### 4. Options Normalization

Each `withX()` method accepts either options or no argument. Internally, `true` is stored when called with no options, then normalized to `{}` at build time.

```typescript
withLogging(options?: LoggingPluginOptions): GunshiMcpBuilder {
  this.config.logging = options ?? true
  return this
}

function normalizeOptions<T>(value: T | true | undefined): T | undefined {
  if (value === true) return {} as T
  return value
}
```

#### 5. Fluent API Returns Same Instance

Each method returns `this` for chaining, not a new builder instance. This is simpler and sufficient since config is accumulated.

## Alternatives Considered

### 1. Synchronous build() with require()

Could use synchronous imports, but dynamic imports are preferred for tree-shaking and keeping initial bundle size small.

### 2. Computed Dependency Order

Could read plugin `dependencies` arrays and topologically sort. Rejected as over-engineering - the plugin set is fixed and small.

### 3. Separate Builder Per Composition

Could create new builder instances for immutability:

```typescript
withLogging() {
  return new Builder({ ...this.config, logging: true })
}
```

Rejected as unnecessary complexity for this use case.

### 4. Plugin Presets

Could add preset methods:

```typescript
.withMcpStack()   // discovery + registry + server
.withCliStack()   // schema + registry + cli
.withFullStack()  // everything
```

Not implemented yet - could add if common patterns emerge.

## Future Improvements

### OpenCode Plugin Integration

`withOpenCode()` is currently a placeholder that stores config but doesn't create a plugin. Once `gunshi-mcp-opencode-plugin` is implemented, update `build()`:

```typescript
if (this.config.opencode) {
  const { createOpenCodePlugin } = await import("./opencode/plugin.ts")
  plugins.push(createOpenCodePlugin(normalizeOptions(this.config.opencode)))
}
```

### Validation

Could add validation in `build()`:

- Warn if CLI added without registry (commands would be empty)
- Warn if server has autoRegister but no registry
- Error on conflicting options

### Plugin Removal

Could add `without()` for removing plugins from presets:

```typescript
.withFullStack()
.without("opencode")
```

### Conditional Plugins

Could support conditional inclusion:

```typescript
.withServer({ when: process.env.MCP_ENABLED === "true" })
```

## Test Coverage

17 tests covering:

- Empty builder returns empty array
- Each plugin method adds correct plugin
- Schema auto-included with CLI
- No schema duplication
- Plugin chaining
- Options passing
- Dependency ordering (discovery < registry, schema < cli, registry < server)
- Fluent API returns same builder instance
