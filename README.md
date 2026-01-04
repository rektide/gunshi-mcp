# gunshi-mcp

> Gunshi plugin that exposes CLI commands as Model Context Protocol (MCP) tools and loads prompts from a `prompts/` folder

[![npm version](https://img.shields.io/npm/v/gunshi-mcp.svg)](https://www.npmjs.com/package/gunshi-mcp)
[![License](https://img.shields.io/npm/l/gunshi-mcp.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [MCP Tools](#mcp-tools)
- [MCP Prompts](#mcp-prompts)
- [API](#api)
- [Examples](#examples)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🚀 **Expose Gunshi Commands as MCP Tools** - Automatically discovers all registered Gunshi commands and creates MCP tools for each
- 📝 **Prompt Loading System** - Loads and registers prompts from a `prompts/` folder at project root
- 🔌 **Simple Plugin Integration** - Drop-in Gunshi plugin with minimal setup
- 🎯 **Type-Safe** - Full TypeScript support with proper type definitions
- ⚡ **Zero Configuration** - Works out of the box with sensible defaults
- 🛠️ **Extensible** - Customize prompts directory, server options, and more
- 🧪 **Tested** - Comprehensive test suite with Vitest

## Installation

```bash
# Using pnpm (recommended)
pnpm add gunshi-mcp

# Using npm
npm install gunshi-mcp

# Using yarn
yarn add gunshi-mcp
```

### Peer Dependencies

Ensure you have `gunshi` installed in your project:

```bash
pnpm add gunshi
```

## Usage

### Basic Setup

```typescript
import { cli, define } from 'gunshi'
import mcpPlugin from 'gunshi-mcp'

// Define your Gunshi commands
const command = define({
	name: 'my-cli',
	description: 'My CLI application',
	args: {
		verbose: {
			type: 'boolean',
			description: 'Enable verbose output'
		}
	},
	run: ctx => {
		if (ctx.values.verbose) {
			console.log('Verbose mode enabled')
		}
		console.log('My CLI running...')
	}
})

// Add MCP plugin and start CLI
await cli(process.argv.slice(2), command, {
	name: 'my-cli',
	version: '1.0.0',
	plugins: [mcpPlugin()]
})
```

### Starting the MCP Server

```bash
# Run MCP server command
my-cli mcp

# With options
my-cli mcp --port 3000
```

### Connecting MCP Client

The MCP server will expose all your Gunshi commands as tools:

```bash
# Example MCP client connection
mcp-client connect --transport stdio --command "my-cli mcp"
```

## Configuration

The plugin accepts configuration options:

```typescript
import mcpPlugin from 'gunshi-mcp'

const plugin = mcpPlugin({
	promptsDir: './custom-prompts',  // Custom prompts directory
	debug: true,                       // Enable debug logging
})
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `promptsDir` | `string` | `{projectRoot}/prompts` | Path to prompts directory |
| `debug` | `boolean` | `false` | Enable debug logging |

## MCP Tools

Every Gunshi command in your CLI is automatically exposed as an MCP tool with:

- **Tool Name**: Same as command name (kebab-case)
- **Description**: Command description from metadata
- **Input Schema**: Automatically generated from command arguments

### Example

If you have a Gunshi command:

```typescript
const deployCommand = define({
	name: 'deploy',
	description: 'Deploy application',
	args: {
		environment: {
			type: 'string',
			required: true,
			description: 'Target environment'
		},
		version: {
			type: 'string',
			description: 'Version to deploy'
		}
	},
	run: ctx => {
		console.log(`Deploying to ${ctx.values.environment}`)
	}
})
```

The MCP tool will be:

```json
{
  "name": "deploy",
  "description": "Deploy application",
  "inputSchema": {
    "type": "object",
    "properties": {
      "environment": {
        "type": "string",
        "description": "Target environment"
      },
      "version": {
        "type": "string",
        "description": "Version to deploy"
      }
    },
    "required": ["environment"]
  }
}
```

## MCP Prompts

Create markdown files in your `prompts/` directory to expose them as MCP prompts:

### Prompt Format

```markdown
# Code Review Prompt

Review the following code for best practices, performance, and potential issues.

## Usage

This prompt provides a structured approach to code review focusing on:
- Code quality and readability
- Performance considerations
- Security concerns
- Best practices adherence

## Example

When reviewing code, consider:
1. Are there any obvious bugs or edge cases?
2. Is code readable and maintainable?
3. Are there any performance optimizations?
4. Are security best practices followed?
```

### File Structure

```
my-project/
├── prompts/
│   ├── code-review.md
│   ├── documentation.md
│   └── refactoring.md
└── src/
    └── cli.ts
```

The prompts will be registered and available to MCP clients.

## API

### `createMcpPlugin(options?)`

Creates a Gunshi MCP plugin instance.

```typescript
import { createMcpPlugin } from 'gunshi-mcp'

const plugin = createMcpPlugin({
	promptsDir: './prompts',
	debug: false
})
```

### Plugin Extension

The plugin extends command context with MCP server controls:

```typescript
interface McpExtension {
	startServer: (options?: { port?: number }) => Promise<void>
	stopServer: () => Promise<void>
}
```

### Accessing Extension

```typescript
const command = define({
	name: 'my-cli',
	run: ctx => {
		const mcp = ctx.extensions['mcp']
		await mcp.startServer({ port: 3000 })
	}
})
```

## Examples

### Complete Example

```typescript
import { cli, define } from 'gunshi'
import mcpPlugin from 'gunshi-mcp'

// Define multiple commands
const buildCommand = define({
	name: 'build',
	description: 'Build application',
	args: {
		watch: {
			type: 'boolean',
			description: 'Watch for changes'
		}
	},
	run: ctx => {
		console.log('Building...')
	}
})

const testCommand = define({
	name: 'test',
	description: 'Run tests',
	args: {
		coverage: {
			type: 'boolean',
			description: 'Generate coverage report'
		}
	},
	run: ctx => {
		console.log('Running tests...')
	}
})

// Setup CLI with MCP plugin
await cli(process.argv.slice(2), [buildCommand, testCommand], {
	name: 'dev-cli',
	version: '1.0.0',
	subCommands: {
		build: buildCommand,
		test: testCommand
	},
	plugins: [mcpPlugin({ debug: true })]
})
```

See [examples/](./examples/) for more usage examples.

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/rektide/gunshi-mcp.git
cd gunshi-mcp

# Install dependencies
pnpm install

# Run typecheck
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test

# Build (runs typecheck, lint, format check, and tests)
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Code Style

This project uses:
- **oxfmt** for code formatting
- **oxlint** for linting
- **TypeScript** strict mode with isolated declarations

Before committing:

```bash
npm run format
npm run lint
npm run typecheck
```

Or just run:

```bash
npm run build
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main branch.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT © [rektide de la faye](https://github.com/rektide)

## Related

- [gunshi](https://github.com/kazupon/gunshi) - Modern JavaScript CLI framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - Open protocol for LLM context
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for MCP
