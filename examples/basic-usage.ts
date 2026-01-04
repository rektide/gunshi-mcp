import { cli, define } from 'gunshi'
import mcpPlugin from './src/plugin.ts'

const command = define({
	name: 'example-cli',
	description: 'Example CLI with MCP support',
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
			console.log('Example CLI running...')
		}
})

await cli(process.argv.slice(2), command, {
		name: 'example-cli',
		version: '1.0.0',
		plugins: [mcpPlugin()]
})
