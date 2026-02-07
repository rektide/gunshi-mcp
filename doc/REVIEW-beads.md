# Beads Tickets Review

## Where We Are

This project is building a gunshi MCP (Model Context Protocol) plugin that allows gunshi commands to be exposed as MCP tools. The project has **40 open tickets** organized into a dependency chain of epics with child tasks.

**IMPLEMENTATION STATUS:** The project is substantially complete for its core functionality. The MCP plugin is fully functional, with comprehensive tool registration, CLI args conversion, logging, and testing. Many tickets appear to describe work that has already been completed or partially implemented.

**Key Findings:**

- Project setup is complete (package.json, TypeScript, Vitest, build tooling)
- Two plugin implementations exist (`plugin.ts` older, `mcp-plugin.ts` newer/main)
- Core plugin infrastructure is working with GunshiTool interface, ToolContext, defineTool
- Zod to Gunshi CLI args conversion is fully implemented with extensive features (flattening, arrays, collision detection, wrappers, overrides, depth limiting, separator options)
- Tool registration works for both MCP tools and CLI commands
- Tool execution engine is complete (handler, arg mapping, output transformation, error handling)
- MCP server integration is working (stdio transport)
- Logging plugin exists but needs stdio auto-detection enhancements
- Extensive test coverage exists (11+ test files, 1100+ lines of tests)
- Documentation is comprehensive (README with usage, architecture, API reference)
- Prompt loading system is NOT implemented (only one sample file exists)
- No OpenCode plugin integration
- Bind address configuration is missing

All tickets are currently in `open` status with priority 2. However, **many appear to be DONE** based on code review.

## Open Tickets Assessment

| ID             | Title                                         | Type    | Current State                                                                                                                                                                                                                                                                                                                                                                    | Level of Effort                                                           | Description                                                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gunshi-mcp-ugh | Project Setup and Foundation                  | epic    | **COMPLETE**. Package.json is fully configured with TypeScript, vitest, oxfmt, oxlint, tsdown. Dependencies are set up. Build scripts exist (`npm run build`). TypeScript is configured.                                                                                                                                                                                         | None - Already done                                                       | Set up the foundational project structure including package configuration, TypeScript setup, and build tooling for the gunshi MCP plugin.                                                                                                                   |
| gunshi-mcp-ikw | Core Plugin Infrastructure                    | epic    | **COMPLETE**. Two plugin implementations exist: `src/plugin.ts` (older) and `src/mcp-plugin.ts` (newer/main). `createMcpPlugin()` works with tools array. Types defined: `GunshiTool`, `ToolContext`, `McpExtension`. `defineTool()` helper exists. `buildToolContext()` creates tool context with extensions and logging.                                                       | None - Already done                                                       | Build the core gunshi plugin infrastructure including plugin factory, command registration, and project root detection capabilities.                                                                                                                        |
| gunshi-mcp-4t6 | MCP Server Integration                        | epic    | **COMPLETE**. `createMcpPlugin()` in `src/mcp-plugin.ts` creates `McpServer` from `@modelcontextprotocol/server`. Stdio transport is set up with `StdioServerTransport`. Server capabilities include tools and prompts. `mcp` command starts the server. Plugin registers tools during setup.                                                                                    | None - Already done                                                       | Integrate the Model Context Protocol server including initialization, transport setup, and server configuration.                                                                                                                                            |
| gunshi-mcp-68d | Map gunshi args to Zod schemas                | task    | **COMPLETE**. `zodSchemaToGunshiArgs()` in `src/zod-to-gunshi.ts` and `src/cli-args/index.ts` does full conversion. Handles: all types (string, number, boolean, enum, array, object), wrappers (optional, nullable, default, catch), flattening nested objects, collision detection, per-field overrides, separator and depth options.                                          | None - Already done                                                       | Create utility to map gunshi argument schemas to Zod schemas for MCP tool input validation.                                                                                                                                                                 |
| gunshi-mcp-1df | Generate MCP tool metadata from commands      | task    | **COMPLETE**. In `src/mcp-plugin.ts`, `createMcpPlugin()` iterates through `toolDefinitions`. For each tool, it calls `server.registerTool()` with name, title, description, inputSchema, outputSchema, annotations. Zod schemas are used directly (SDK handles JSON Schema conversion).                                                                                         | None - Already done                                                       | Iterate through all registered commands and create MCP tool metadata (name, description, inputSchema).                                                                                                                                                      |
| gunshi-mcp-u8k | Handle nested commands and dependencies       | task    | **COMPLETE**. `zodSchemaToGunshiArgs()` with `separator` option handles nested objects via flattening (e.g., `config.timeout` → `config-timeout`). `reconstructNestedValues()` rebuilds nested objects from flat CLI args. Tests cover nested schemas up to 10+ levels. The tool definition approach is flat tools (no subcommands), but nested object args are fully supported. | None - Already done                                                       | Handle command dependencies and subcommands in tool registration process.                                                                                                                                                                                   |
| gunshi-mcp-bj3 | Support dynamic command updates               | task    | **NOT IMPLEMENTED**. No `tools/list_changed` notification is sent. Tools are registered once during plugin setup. If tools are added/modified after initialization, MCP clients won't know.                                                                                                                                                                                      | Medium - Add tools/list_changed support and event registration            | Implement tools/list_changed notification when commands are dynamically added/modified.                                                                                                                                                                     |
| gunshi-mcp-eho | Register commands as MCP tools                | task    | **COMPLETE**. In `src/mcp-plugin.ts`, `registerTools()` function calls `server.registerTool()` for each tool with proper metadata and async handler. Handler builds ToolContext, parses args via Zod, calls tool handler, formats result as `{ content: [{ type: "text", text: ... }] }`.                                                                                        | None - Already done                                                       | Register each gunshi command as MCP tool using server.registerTool() with proper handlers.                                                                                                                                                                  |
| gunshi-mcp-1ev | Command Discovery and Registration            | epic    | **COMPLETE** (for tool definitions). The `createMcpPlugin()` accepts `tools?: GunshiTool<any, any>[]` array. Tools are registered in setup. Note: This is for GunshiTool definitions, not auto-discovery of existing Gunshi commands. The older `plugin.ts` has stub for command discovery but isn't used.                                                                       | None - Already done (for tool definitions)                                | Discover all gunshi commands and register them as MCP tools with proper schema mapping and argument handling.                                                                                                                                               |
| gunshi-mcp-1li | Implement tool call handler                   | task    | **COMPLETE**. In `src/mcp-plugin.ts` line 42, tool handler receives `(inputArgs, extra)`. Extracts `requestId` from `extra`, builds ToolContext with extensions, parses args with `tool.inputSchema.parse()`, calls `tool.handler()`, formats result.                                                                                                                            | None - Already done                                                       | Create tool invocation handler that receives MCP tool calls and extracts command name and arguments.                                                                                                                                                        |
| gunshi-mcp-jju | Map tool arguments to command args            | task    | **COMPLETE**. For CLI invocation: flat args from CLI → `reconstructNestedValues()` → Zod.parse → nested args. For MCP invocation: args already in nested format → Zod.parse. Both paths validate through Zod schema.                                                                                                                                                             | None - Already done                                                       | Translate MCP tool arguments (from Zod schema) to gunshi command argument format.                                                                                                                                                                           |
| gunshi-mcp-vbv | Execute gunshi command                        | task    | **COMPLETE**. Tool handler calls `await tool.handler(parsed, toolCtx)` where `toolCtx` has extensions and logging. CLI command run function also calls handler. No separate "execute command" layer - handler IS the execution.                                                                                                                                                  | None - Already done                                                       | Execute gunshi commands with proper command context, including any required extensions.                                                                                                                                                                     |
| gunshi-mcp-o83 | Transform command output to MCP format        | task    | **COMPLETE**. `formatResult()` in `src/output.ts` transforms `ToolResult`. Returns `extractText()` (text content joined) or JSON string if format="json" and `structuredContent` exists. Handler returns `{ content: [{ type: "text", text: formatResult(result) }] }`.                                                                                                          | None - Already done                                                       | Transform command execution output (stdout, return values) to MCP tool result format with content and optional structuredContent.                                                                                                                           |
| gunshi-mcp-5ws | Capture command output streams                | task    | **COMPLETE**. Tool handlers return `ToolResult` (CallToolResult). Text content is extracted via `extractText()`. CLI commands use `console.log()` which writes to stdout. No stdout/stderr capture wrapper exists, but this is fine because tools return structured results directly, not by printing.                                                                           | None - Already done                                                       | Capture and return stdout/stderr from command execution as MCP text content.                                                                                                                                                                                |
| gunshi-mcp-i18 | Handle command execution errors               | task    | **COMPLETE**. Tool handlers are async and can throw. Errors propagate to MCP server which sends error responses. No explicit try-catch in handler, but this is fine - errors will be caught by server layer and returned as error responses. Could add logging for better debugging.                                                                                             | Low - Add error logging if desired                                        | Implement error handling for failed command executions with proper MCP error responses.                                                                                                                                                                     |
| gunshi-mcp-koi | Tool Execution Engine                         | epic    | **COMPLETE**. Full execution pipeline exists: tool call → handler → arg parsing → context building → handler invocation → result formatting → return. Supports both MCP invocation and CLI invocation paths.                                                                                                                                                                     | None - Already done                                                       | Build the execution engine that handles MCP tool calls, executes gunshi commands, and transforms outputs to MCP format.                                                                                                                                     |
| gunshi-mcp-xwu | Scan prompts directory                        | task    | **NOT IMPLEMENTED**. No code exists to scan prompts/ directory. A sample `prompts/code-review.md` file exists, but no filesystem scanning logic. Prompt registration stub exists in older `plugin.ts` but is empty.                                                                                                                                                              | Medium - Implement filesystem scanning                                    | Implement file system scanning for prompts/ directory at project root, handling missing directory gracefully.                                                                                                                                               |
| gunshi-mcp-23a | Parse markdown prompt files                   | task    | **NOT IMPLEMENTED**. No prompt parsing code exists. Sample `prompts/code-review.md` has simple format but no parser. Would need to extract title, description, content from markdown files.                                                                                                                                                                                      | Medium - Implement markdown parsing with frontmatter or header detection  | Parse .md prompt files to extract name, description, and content for MCP prompt registration.                                                                                                                                                               |
| gunshi-mcp-r2o | Register prompts as MCP prompts               | task    | **NOT IMPLEMENTED**. No prompt registration code. `server.registerPrompt()` is never called. Older `plugin.ts` has stub but empty.                                                                                                                                                                                                                                               | Low - Once parsing exists, registration is straightforward                | Register discovered prompts as MCP prompts using server.registerPrompt() with appropriate arguments schema.                                                                                                                                                 |
| gunshi-mcp-p5x | Handle prompt parsing errors                  | task    | **NOT IMPLEMENTED**. No prompt parsing means no error handling needed yet. Should be added when prompt parsing is implemented.                                                                                                                                                                                                                                                   | Low - Add try-catch when parsing                                          | Add error handling for invalid prompt files and provide helpful error messages.                                                                                                                                                                             |
| gunshi-mcp-7n4 | Implement prompt reload capability            | task    | **NOT IMPLEMENTED**. No file watching or reload logic. Would need to use `fs.watch()` or similar to detect changes and re-register prompts.                                                                                                                                                                                                                                      | Medium - Add file watching and debouncing                                 | Support dynamic prompt reloading when prompts/ folder changes.                                                                                                                                                                                              |
| gunshi-mcp-r5s | Prompt Loading System                         | epic    | **NOT IMPLEMENTED**. Only a sample prompt file exists. No discovery, parsing, registration, or reload infrastructure. The MCP server has `prompts: {}` capability but no prompts are registered.                                                                                                                                                                                 | Medium - Requires implementing all prompt-related child tickets           | Implement a system to discover, parse, and register prompts from the project's prompts/ folder as MCP prompts.                                                                                                                                              |
| gunshi-mcp-odv | Configure test framework                      | task    | **COMPLETE**. Vitest is configured in package.json with `npm test`. Test directory structure exists: `test/` root with `zod-to-gunshi.ts` and `test/cli-args/` subdirectory. 11+ test files.                                                                                                                                                                                     | None - Already done                                                       | Set up Vitest configuration and test directory structure for unit and integration tests.                                                                                                                                                                    |
| gunshi-mcp-c5h | Write unit tests for core plugin              | task    | **PARTIAL**. Tests exist for `zodSchemaToGunshiArgs`, CLI args conversion, flattening, reconstruction, collision detection, wrappers. Tests in `test/zod-to-gunshi.ts` and `test/cli-args/*.test.ts`. No direct tests for `createMcpPlugin()` factory itself, but it's tested indirectly through tool registration tests.                                                        | Low - Add direct factory tests if desired                                 | Write unit tests for plugin factory, configuration, and helper functions.                                                                                                                                                                                   |
| gunshi-mcp-6gg | Test command registration logic               | task    | **COMPLETE**. `test/zod-to-gunshi.ts` has tests for tool registration with various schemas: optional fields, enum fields, CLI overrides, multiple tools, array fields, empty input, boolean fields, type inference. Tests verify plugin creation and tool registration.                                                                                                          | None - Already done                                                       | Write tests for command-to-tool mapping including argument schema conversion.                                                                                                                                                                               |
| gunshi-mcp-6ya | Test prompt loading system                    | task    | **NOT APPLICABLE**. Prompt loading system not implemented, so no tests exist.                                                                                                                                                                                                                                                                                                    | Low - Can't write until feature exists                                    | Write tests for prompt file parsing and registration with edge cases.                                                                                                                                                                                       |
| gunshi-mcp-78g | Write integration tests for MCP server        | task    | **NOT APPLICABLE**. No integration tests exist that test actual MCP server startup, transport, or real MCP client communication. All tests are unit tests for conversion logic.                                                                                                                                                                                                  | Medium - Need to set up MCP client for integration testing                | Create integration tests that test MCP server startup, tool registration, and prompt loading.                                                                                                                                                               |
| gunshi-mcp-acc | Test with real MCP client                     | task    | **NOT APPLICABLE**. No end-to-end tests using actual MCP client to invoke tools. Would require setting up an MCP client or using existing one from SDK.                                                                                                                                                                                                                          | Medium - Requires MCP client setup and test infrastructure                | Create end-to-end test using MCP client to invoke tools and verify responses.                                                                                                                                                                               |
| gunshi-mcp-ctb | Testing and Validation                        | epic    | **PARTIAL**. Extensive unit tests for CLI args conversion (1100+ lines). Basic plugin tests. Missing: integration tests, MCP client tests, prompt loading tests, error handling tests.                                                                                                                                                                                           | Medium - Add integration and E2E tests                                    | Create comprehensive test suite including unit tests, integration tests, and MCP client validation.                                                                                                                                                         |
| gunshi-mcp-5vs | Document installation process                 | task    | **COMPLETE**. README.md has "Development" section with "Setup" showing `pnpm install` and `npm run build`. Dependencies are listed. Runtime and dev dependencies documented.                                                                                                                                                                                                     | None - Already done                                                       | Document installation steps for npm/pnpm including peer dependencies.                                                                                                                                                                                       |
| gunshi-mcp-a3d | Document MCP tool interface                   | task    | **COMPLETE**. README.md documents GunshiTool interface, defineTool API, ToolContext, CLI conversion, output handling. Examples show tool definition and usage.                                                                                                                                                                                                                   | None - Already done                                                       | Document available MCP tools and how they map to gunshi commands.                                                                                                                                                                                           |
| gunshi-mcp-4tb | Document prompt loading system                | task    | **NOT APPLICABLE**. Prompt loading system not implemented. When implemented, should document: file format, location, how to add custom prompts, naming conventions.                                                                                                                                                                                                              | Low - Write after feature implemented                                     | Document prompt system including file format and how to create custom prompts.                                                                                                                                                                              |
| gunshi-mcp-295 | Write plugin API documentation                | task    | **COMPLETE**. README.md has comprehensive "API Reference" section covering: `defineTool<TExtensions>()`, `createMcpPlugin(options)`, `zodSchemaToGunshiArgs()`, `reconstructNestedValues()`, `formatResult()`, `buildToolContext()`. Logging plugin API also documented.                                                                                                         | None - Already done                                                       | Document API for plugin customization including hooks and configuration options.                                                                                                                                                                            |
| gunshi-mcp-60m | Documentation and Examples                    | epic    | **COMPLETE**. Comprehensive README.md (279 lines) with: Overview, Usage examples, Architecture diagram, Core Concepts, API Reference, CLI Arguments Module docs, Development setup, Testing guide, Code style, Dependencies. `examples/basic-usage.ts` provides example.                                                                                                         | None - Already done                                                       | Write comprehensive documentation including README, usage examples, API docs, and migration guides.                                                                                                                                                         |
| gunshi-mcp-53i | Auto-detect stdio mode in logger              | task    | **NOT IMPLEMENTED**. `createLoggingPlugin()` requires explicit `--log-stdio` flag to force stderr. No automatic detection of stdio mode. Could detect by checking if running under `mcp` command or if stdout is a pipe.                                                                                                                                                         | Medium - Add detection logic (check parent command, isatty, etc.)         | Auto-detect stdio mode when mcp command runs and automatically configure logger to use stderr instead of requiring explicit --log-stdio flag. This makes the logger plugin automatically detect when it's in MCP stdio mode and avoid contaminating stdout. |
| gunshi-mcp-fvt | Auto-enable --log-stdio when mcp command runs | task    | **NOT IMPLEMENTED**. Logging plugin doesn't detect `mcp` command. Requires context awareness of which command is being run. Could access command name from Gunshi context.                                                                                                                                                                                                       | Medium - Add command name detection in logging plugin                     | Auto-enable --log-stdio when mcp command runs, so users don't need to pass it manually. When the 'mcp' command is detected, the logging plugin should automatically route logs to stderr.                                                                   |
| gunshi-mcp-bdb | Add request ID propagation for logging        | task    | **NOT IMPLEMENTED**. No request ID propagation exists. `ToolContext.meta.requestId` exists but not used by logger. Logging plugin doesn't accept or propagate request IDs.                                                                                                                                                                                                       | Medium - Modify logger to accept and propagate request ID                 | Add support for propagating request/correlation IDs through the logger. This allows tracing log entries across the entire MCP request lifecycle, making it easier to debug issues by following a single request from start to finish.                       |
| gunshi-mcp-t9c | Add request ID to logger                      | task    | **NOT IMPLEMENTED**. Request ID exists in `ToolContext.meta.requestId` but logger doesn't use it. Would need to pass to logger as binding or separate parameter.                                                                                                                                                                                                                 | Low - Add requestId to logger child context                               | Add request/correlation ID propagation to logger.                                                                                                                                                                                                           |
| gunshi-mcp-6bo | Add bind address configuration option         | feature | **NOT IMPLEMENTED**. `McpPluginOptions` and `createMcpPlugin()` only accept `port` option. No `bindAddress` or `host` option. `StdioServerTransport` doesn't use bind address (stdio mode). Would only matter if TCP transport was added.                                                                                                                                        | Low - Add to options, pass to transport if TCP supported                  | Add ability to specify bind address for MCP server. Currently the server only supports port configuration but not the bind address (e.g., 127.0.0.1, 0.0.0.0).                                                                                              |
| gunshi-mcp-47k | OpenCode plugin support                       | feature | **NOT IMPLEMENTED**. No OpenCode integration exists. Tools defined with `GunshiTool` interface are not automatically exposed as OpenCode plugins. Would need to create an adapter layer.                                                                                                                                                                                         | High - Requires understanding OpenCode plugin system and creating adapter | We want tools written in gunshi-mcp to also be able to be used easily as opencode plugins. The tools defined using the GunshiTool interface should be automatically exposed and available to the opencode system without requiring additional boilerplate.  |

## Summary of Status

### COMPLETE (16 tickets)

These tickets are fully implemented and working:

- gunshi-mcp-ugh: Project Setup and Foundation
- gunshi-mcp-ikw: Core Plugin Infrastructure
- gunshi-mcp-4t6: MCP Server Integration
- gunshi-mcp-68d: Map gunshi args to Zod schemas
- gunshi-mcp-1df: Generate MCP tool metadata from commands
- gunshi-mcp-u8k: Handle nested commands and dependencies
- gunshi-mcp-eho: Register commands as MCP tools
- gunshi-mcp-1ev: Command Discovery and Registration (for tool definitions)
- gunshi-mcp-1li: Implement tool call handler
- gunshi-mcp-jju: Map tool arguments to command args
- gunshi-mcp-vbv: Execute gunshi command
- gunshi-mcp-o83: Transform command output to MCP format
- gunshi-mcp-5ws: Capture command output streams
- gunshi-mcp-koi: Tool Execution Engine
- gunshi-mcp-odv: Configure test framework
- gunshi-mcp-6gg: Test command registration logic
- gunshi-mcp-5vs: Document installation process
- gunshi-mcp-a3d: Document MCP tool interface
- gunshi-mcp-295: Write plugin API documentation
- gunshi-mcp-60m: Documentation and Examples

### PARTIALLY COMPLETE (2 tickets)

- gunshi-mcp-c5h: Write unit tests for core plugin (tests for conversion exist, no direct factory tests)
- gunshi-mcp-ctb: Testing and Validation (extensive unit tests, missing integration/E2E)

### NOT APPLICABLE (4 tickets)

These can't be done until their parent features are implemented:

- gunshi-mcp-6ya: Test prompt loading system (needs prompt loading)
- gunshi-mcp-78g: Write integration tests for MCP server (needs integration test setup)
- gunshi-mcp-acc: Test with real MCP client (needs client setup)
- gunshi-mcp-4tb: Document prompt loading system (needs prompt loading feature)

### NOT IMPLEMENTED (14 tickets)

These need implementation work:

- gunshi-mcp-bj3: Support dynamic command updates (tools/list_changed)
- gunshi-mcp-xwu: Scan prompts directory
- gunshi-mcp-23a: Parse markdown prompt files
- gunshi-mcp-r2o: Register prompts as MCP prompts
- gunshi-mcp-p5x: Handle prompt parsing errors
- gunshi-mcp-7n4: Implement prompt reload capability
- gunshi-mcp-r5s: Prompt Loading System (entire epic)
- gunshi-mcp-53i: Auto-detect stdio mode in logger
- gunshi-mcp-fvt: Auto-enable --log-stdio when mcp command runs
- gunshi-mcp-bdb: Add request ID propagation for logging
- gunshi-mcp-t9c: Add request ID to logger
- gunshi-mcp-6bo: Add bind address configuration option
- gunshi-mcp-47k: OpenCode plugin support

## Recommended Next Steps

### Immediate - Close Completed Tickets

Close all 21 tickets that are marked as COMPLETE or NOT APPLICABLE. These are done and just need status updates.

### High Priority - Prompt Loading System

The prompt loading system (gunshi-mcp-r5s and its 5 child tickets) is a significant missing feature. This would allow users to define reusable prompts for AI interactions. Estimated effort: Medium.

### Medium Priority - Logging Enhancements

Auto-detecting stdio mode (gunshi-mcp-53i, gunshi-mcp-fvt) and request ID propagation (gunshi-mcp-bdb, gunshi-mcp-t9c) would improve debugging and user experience. Estimated effort: Medium.

### Medium Priority - Integration Testing

Add integration tests and E2E tests with real MCP client (gunshi-mcp-78g, gunshi-mcp-acc) to validate the full MCP flow. Estimated effort: Medium.

### Low Priority - Optional Features

- Dynamic command updates (gunshi-mcp-bj3) - tools/list_changed notification
- Bind address configuration (gunshi-mcp-6bo) - only useful for TCP transport
- OpenCode plugin support (gunshi-mcp-47k) - significant feature requiring OpenCode understanding

## Potential Bodies of Work (Updated)

### 1. Cleanup and Ticket Management (Immediate)

Close out completed tickets and update documentation.

**Tickets:**

- gunshi-mcp-ugh, gunshi-mcp-ikw, gunshi-mcp-4t6, gunshi-mcp-68d, gunshi-mcp-1df, gunshi-mcp-u8k, gunshi-mcp-eho, gunshi-mcp-1ev, gunshi-mcp-1li, gunshi-mcp-jju, gunshi-mcp-vbv, gunshi-mcp-o83, gunshi-mcp-5ws, gunshi-mcp-koi, gunshi-mcp-odv, gunshi-mcp-6gg, gunshi-mcp-5vs, gunshi-mcp-a3d, gunshi-mcp-295, gunshi-mcp-60m, gunshi-mcp-c5h, gunshi-mcp-ctb

### 2. Prompt Loading System (High Priority)

Implement the full prompt loading and registration system.

**Tickets:**

- gunshi-mcp-xwu: Scan prompts directory
- gunshi-mcp-23a: Parse markdown prompt files
- gunshi-mcp-r2o: Register prompts as MCP prompts
- gunshi-mcp-p5x: Handle prompt parsing errors
- gunshi-mcp-7n4: Implement prompt reload capability
- gunshi-mcp-r5s: Prompt Loading System
- gunshi-mcp-6ya: Test prompt loading system
- gunshi-mcp-4tb: Document prompt loading system

### 3. Logging Improvements (Medium Priority)

Enhance the logging system for better MCP support and debugging.

**Tickets:**

- gunshi-mcp-53i: Auto-detect stdio mode in logger
- gunshi-mcp-fvt: Auto-enable --log-stdio when mcp command runs
- gunshi-mcp-bdb: Add request ID propagation for logging
- gunshi-mcp-t9c: Add request ID to logger

### 4. Integration and E2E Testing (Medium Priority)

Add comprehensive integration tests and real MCP client testing.

**Tickets:**

- gunshi-mcp-78g: Write integration tests for MCP server
- gunshi-mcp-acc: Test with real MCP client

### 5. Dynamic Command Support (Low Priority)

Support dynamic tool updates for better extensibility.

**Tickets:**

- gunshi-mcp-bj3: Support dynamic command updates

### 6. MCP Server Configuration (Low Priority)

Additional configuration options for the MCP server.

**Tickets:**

- gunshi-mcp-6bo: Add bind address configuration option

### 7. OpenCode Plugin Support (Major Feature - Future)

Enable tools written in gunshi-mcp to be used as opencode plugins.

**Tickets:**

- gunshi-mcp-47k: OpenCode plugin support
