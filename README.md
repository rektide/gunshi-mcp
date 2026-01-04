# Gunshi MCP Plugin - Development Guide

A Gunshi plugin that exposes CLI commands as Model Context Protocol (MCP) tools and loads prompts from a `prompts/` folder at the project root.

> **🚧 Early Development - Foundation Phase**
>
> This README is focused on guiding development forward. For end-user documentation, see DOCS.md when ready.

## Overview

This plugin integrates Gunshi's command system with the Model Context Protocol, allowing LLMs to interact with your CLI commands through a standardized interface. It automatically:

- Discovers all registered Gunshi commands
- Registers each command as an MCP tool
- Loads prompt templates from a `prompts/` folder
- Provides a stdin/stdout MCP server for communication

## Project Status

**🚧 Early Development - Foundation Phase**

The project is in the initial setup phase. Core infrastructure is being built to support MCP integration.

### Completed

- ✅ Package configuration
- ✅ TypeScript configuration
- ✅ Build script setup
- ✅ Project structure defined
- ✅ README created

### In Progress

- Setting up directory structure
- Installing dependencies
- Core plugin infrastructure

## Development Guide

### Quick Start for Developers

```bash
# 1. Install dependencies
pnpm install

# 2. Run quality checks (typecheck, lint, format, test in parallel)
npm run build

# 3. View tasks
bd ready

# 4. Start working on a task
bd show <task-id>
bd update <task-id> --status in_progress

# 5. When done
bd close <task-id>
```

### Task Tracking

This project uses **beads** for task management. The development plan is organized into 8 epics:

1. **Project Setup and Foundation** - Configuration and build tooling
2. **Core Plugin Infrastructure** - Gunshi plugin factory and command registration
3. **MCP Server Integration** - MCP server setup and stdio transport
4. **Command Discovery** - Mapping Gunshi commands to MCP tools
5. **Prompt Loading System** - Loading prompts from prompts/ folder
6. **Tool Execution Engine** - Handling MCP tool calls and executing commands
7. **Testing and Validation** - Unit and integration tests
8. **Documentation and Examples** - User-facing documentation

#### View Tasks

```bash
# See all ready tasks (no blockers)
bd ready

# See all tasks by status
bd list --status open
bd list --status in_progress

# Show task details
bd show <task-id>

# See blocked tasks and why
bd blocked
```

## Architecture

### Components

```
Gunshi CLI
    ↓
Gunshi Plugin System
    ↓
gunshi-mcp Plugin
    ↓
├─ MCP Server (@modelcontextprotocol/sdk)
├─ Command Discovery (accesses Gunshi command registry)
├─ Prompt Loader (reads prompts/ folder)
└─ Tool Execution Handler
```

### Key Responsibilities

**Plugin Factory**

- Creates Gunshi plugin with `plugin()` function
- Registers `mcp` command using `ctx.addCommand()`
- Detects project root via `package-directory`
- Provides configuration options

**MCP Server**

- Initializes `McpServer` instance
- Configures stdio transport
- Exposes tools and prompts to MCP clients

**Command Discovery**

- Accesses Gunshi command registry (likely via `ctx.env.subCommands`)
- Maps command arguments to Zod schemas
- Registers each command as MCP tool with `server.registerTool()`

**Prompt Loader**

- Scans `prompts/` folder at project root
- Parses `.md` files for prompt templates
- Registers prompts with `server.registerPrompt()`

**Tool Execution**

- Receives MCP tool calls
- Parses arguments from MCP request
- Executes corresponding Gunshi command
- Returns results in MCP format

## Development Workflow

### Prerequisites

- Node.js (v18 or higher)
- pnpm (preferred package manager)
- beads (task tracker, see AGENTS.md)

### Setup

```bash
# Clone repository
git clone <repo-url>
cd gunshi-mcp

# Install dependencies
pnpm install

# Verify setup
npm run build
```

### Adding New Features

1. **Create task**: Use `bd create` to add tasks for new features
2. **Implement**: Write code following existing patterns
3. **Test**: Run `npm run build` to verify typecheck, lint, and tests
4. **Commit**: Commit changes with clear messages
5. **Close task**: Mark task complete with `bd close <id>`

### Code Style

- Use TypeScript for all code
- Prefer `.ts` files over `.js`
- Run `oxfmt` before committing
- No comments unless explicitly needed
- Follow existing patterns in the codebase

## Testing

### Test Framework

Uses **Vitest** for unit and integration tests.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/fileName.test.ts
```

### Integration Tests

Integration tests will validate:

- MCP server startup and connection
- Tool registration from Gunshi commands
- Prompt loading from prompts/ folder
- Tool execution and response formatting

## Project Structure

```
gunshi-mcp/
├── src/
│   └── index.ts              # Main plugin entry point
├── tests/
│   ├── index.test.ts          # Plugin tests
│   ├── mcp-server.test.ts    # MCP server tests
│   └── integration.test.ts   # End-to-end tests
├── prompts/                   # Example prompts folder (for users)
├── package.json              # Package configuration
├── tsconfig.json            # TypeScript configuration
└── README.md               # This file
```

## Next Steps for Developers

### Immediate Tasks (Ready to Start)

```bash
# View ready tasks
bd ready

# Likely next tasks:
# - gunshi-mcp-ghh: Set up directory structure
# - gunshi-mcp-k06: Install runtime dependencies
# - gunshi-mcp-6wm: Install development tooling
```

### Recommended Starting Point

1. **Set up directory structure** - Create `src/` and `tests/` directories
2. **Install dependencies** - Run `pnpm install` to get all required packages
3. **Create plugin factory** - Start with basic Gunshi plugin structure
4. **Add MCP command** - Register the `mcp` command
5. **Test basic functionality** - Verify plugin loads without errors

### Technical Research Needed

Before implementing, research:

- **Gunshi command registry access**: How to access all registered commands from a plugin
- **Command argument schemas**: How Gunshi defines argument types for schema mapping
- **MCP tool lifecycle**: How tools are called and how to return results
- **Project root detection**: Using `package-directory` for finding prompts/ folder

## Dependencies

### Runtime

- `gunshi` - CLI framework
- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `package-directory` - Project root detection
- `zod` - Schema validation

### Development

- `vitest` - Testing framework
- `tsdown` - TypeScript bundler
- `@typescript/native-preview` - TypeScript type checking
- `oxfmt` - Code formatter
- `oxlint` - Linter
- `concurrently` - Run multiple npm scripts in parallel

## Contributing

1. Check `bd ready` for available tasks
2. Claim a task with `bd update <id> --status in_progress`
3. Implement the feature
4. Run `npm run build` to verify
5. Commit and push changes
6. Close the task with `bd close <id>`

## License

MIT

## Resources

- [Gunshi Documentation](https://github.com/kazupon/gunshi)
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [beads Task Tracker](https://github.com/sst/beads)
