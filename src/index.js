#!/usr/bin/env node

/** @import { MCPServerConfig } from './clients/types.js' */

import * as clack from '@clack/prompts';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { clients, client_names, clients_supporting_static_oauth } from './clients/index.js';

/**
 * Parses a comma-separated string into an array of trimmed strings
 * @param {string | undefined} value - The comma-separated string
 * @returns {string[]} Array of trimmed strings
 */
function parse_comma_separated(value) {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Parses a comma-separated string of KEY=value pairs into an object
 * @param {string | undefined} value - The comma-separated KEY=value string
 * @returns {Record<string, string>} Object of key-value pairs
 */
function parse_key_value_pairs(value) {
	if (!value) return {};
	/** @type {Record<string, string>} */
	const result = {};
	const pairs = value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	for (const pair of pairs) {
		const eq_index = pair.indexOf('=');
		if (eq_index > 0) {
			const key = pair.substring(0, eq_index).trim();
			const val = pair.substring(eq_index + 1).trim();
			result[key] = val;
		}
	}
	return result;
}

/**
 * Checks if the user cancelled a prompt
 * @param {unknown} value - The value to check
 * @returns {value is symbol} Whether the value is a cancel symbol
 */
function is_cancel(value) {
	return clack.isCancel(value);
}

/**
 * Returns whether a client supports static OAuth credentials
 * @param {string} client_name - The client name to check
 * @returns {boolean} Whether the client supports static OAuth credentials
 */
function supports_static_oauth(client_name) {
	return clients_supporting_static_oauth.includes(client_name.toLowerCase());
}

/**
 * Prints a warning message in interactive or non-interactive mode
 * @param {boolean} is_interactive - Whether the CLI is running interactively
 * @param {string} message - Warning message to print
 * @returns {void}
 */
function print_warning(is_interactive, message) {
	if (is_interactive) {
		clack.note(message, 'Warning');
	} else {
		console.warn(`Warning: ${message}`);
	}
}

/**
 * Warns when a static OAuth flag is provided for clients that will not use it
 * @param {object} options - Warning options
 * @param {'client-id' | 'client-secret'} options.flag_name - The flag name
 * @param {string | undefined} options.flag_value - The provided flag value
 * @param {'stdio' | 'http' | 'sse'} options.type - The server type
 * @param {string[]} options.selected_clients - The selected clients
 * @param {boolean} options.is_interactive - Whether the CLI is running interactively
 * @returns {void}
 */
function warn_unused_static_oauth_flag({
	flag_name,
	flag_value,
	type,
	selected_clients,
	is_interactive,
}) {
	if (!flag_value) {
		return;
	}

	if (type === 'stdio') {
		print_warning(
			is_interactive,
			`--${flag_name} is only used for remote servers and will be ignored for stdio configurations.`,
		);
		return;
	}

	const ignored_clients = selected_clients.filter(
		(client_name) => !supports_static_oauth(client_name),
	);
	if (ignored_clients.length === 0) {
		return;
	}

	const supported_clients = selected_clients.filter((client_name) =>
		supports_static_oauth(client_name),
	);
	if (supported_clients.length === 0) {
		print_warning(
			is_interactive,
			`--${flag_name} was provided, but none of the selected clients support it: ${selected_clients.join(', ')}.`,
		);
		return;
	}

	print_warning(
		is_interactive,
		`--${flag_name} will be ignored by: ${ignored_clients.join(', ')}.`,
	);
}

/**
 * Determines if all required arguments are provided for non-interactive mode
 * @param {object} argv - The parsed arguments
 * @param {string} [argv.name] - Server name
 * @param {string} [argv.type] - Server type
 * @param {string} [argv.command] - Command for local servers
 * @param {string} [argv.url] - URL for remote servers
 * @param {string} [argv.scope] - Config scope
 * @param {string} [argv.clients] - Comma-separated client names
 * @returns {boolean} Whether we can run non-interactively
 */
function can_run_non_interactive(argv) {
	if (!argv.name || !argv.scope || !argv.clients) {
		return false;
	}

	// Type can be explicitly provided or inferred from command/url
	const effective_type = argv.type || (argv.command ? 'stdio' : argv.url ? 'http' : undefined);

	if (!effective_type) {
		return false;
	}

	if (effective_type === 'stdio' && !argv.command) {
		return false;
	}

	if ((effective_type === 'http' || effective_type === 'sse') && !argv.url) {
		return false;
	}

	return true;
}

/**
 * Main CLI function
 * @returns {Promise<void>}
 */
async function main() {
	const argv = await yargs(hideBin(process.argv))
		.scriptName('mcp-add')
		.usage('$0 [options]')
		.option('name', {
			alias: 'n',
			type: 'string',
			description: 'Server name',
		})
		.option('type', {
			alias: 't',
			type: 'string',
			choices: /** @type {const} */ (['stdio', 'http', 'sse']),
			description: 'Server type (stdio, http, or sse)',
		})
		.option('command', {
			alias: 'c',
			type: 'string',
			description:
				'Full command to run (stdio servers only), e.g. "npx -y @modelcontextprotocol/server-filesystem /tmp"',
		})
		.option('env', {
			alias: 'e',
			type: 'string',
			description: 'Comma-separated KEY=value environment variables (stdio servers only)',
		})
		.option('url', {
			alias: 'u',
			type: 'string',
			description: 'Server URL (http servers only)',
		})
		.option('headers', {
			alias: 'H',
			type: 'string',
			description: 'Comma-separated Key=value headers (http servers only)',
		})
		.option('client-id', {
			type: 'string',
			description:
				'Static OAuth client ID for remote servers that do not support dynamic client registration',
		})
		.option('client-secret', {
			type: 'string',
			description:
				'Static OAuth client secret for remote servers that do not support dynamic client registration',
		})
		.option('scope', {
			alias: 's',
			type: 'string',
			choices: /** @type {const} */ (['global', 'project']),
			description: 'Config scope (global or project)',
		})
		.option('clients', {
			alias: 'C',
			type: 'string',
			description: `Comma-separated client names (${client_names.join(', ')})`,
		})
		.help()
		.alias('help', 'h')
		.version()
		.alias('version', 'v')
		.parse();

	const provided_client_id = argv.clientId?.trim() || undefined;
	const provided_client_secret = argv.clientSecret?.trim() || undefined;

	const is_interactive = !can_run_non_interactive(argv);

	if (is_interactive) {
		clack.intro('MCP Server Configuration');
	}

	// Server name
	let name = argv.name;
	if (!name) {
		const name_input = await clack.text({
			message: 'What is the server name?',
			placeholder: 'my-mcp-server',
			validate: (value) => {
				if (!value || !value.trim()) return 'Server name is required';
				if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
					return 'Server name can only contain letters, numbers, hyphens, and underscores';
				}
			},
		});
		if (is_cancel(name_input)) {
			clack.cancel('Operation cancelled');
			process.exit(0);
		}
		name = name_input;
	}

	// Server type - auto-detect from command/url if not explicitly provided
	/** @type {'stdio' | 'http' | 'sse' | undefined} */
	let type = /** @type {'stdio' | 'http' | 'sse' | undefined} */ (argv.type);
	if (!type) {
		// Auto-select type based on provided parameters
		if (argv.command) {
			type = 'stdio';
		} else if (argv.url) {
			type = 'http';
		} else {
			const type_input = await clack.select({
				message: 'What type of server is this?',
				options: [
					{ value: 'stdio', label: 'stdio', hint: 'Runs a local command' },
					{ value: 'http', label: 'HTTP', hint: 'Connects to a URL via HTTP' },
					{
						value: 'sse',
						label: 'SSE',
						hint: 'Connects to a URL via Server-Sent Events',
					},
				],
			});
			if (is_cancel(type_input)) {
				clack.cancel('Operation cancelled');
				process.exit(0);
			}
			type = type_input;
		}
	}

	// Type-specific configuration
	/** @type {string | undefined} */
	let command;
	/** @type {string[]} */
	let args = [];
	/** @type {Record<string, string>} */
	let env = {};
	/** @type {string | undefined} */
	let url;
	/** @type {Record<string, string>} */
	let headers = {};
	/** @type {string | undefined} */
	let client_id = provided_client_id;
	/** @type {string | undefined} */
	let client_secret = provided_client_secret;

	if (type === 'stdio') {
		// Command (full command string with arguments)
		let full_command = argv.command;
		if (!full_command) {
			const command_input = await clack.text({
				message: 'What command should be run?',
				placeholder: 'npx -y @modelcontextprotocol/server-filesystem /tmp',
				validate: (value) => {
					if (!value || !value.trim()) return 'Command is required';
				},
			});
			if (is_cancel(command_input)) {
				clack.cancel('Operation cancelled');
				process.exit(0);
			}
			full_command = command_input;
		}

		// Parse the full command into command and args
		const parts = full_command.trim().split(/\s+/);
		command = parts[0];
		args = parts.slice(1);

		// Environment variables
		if (argv.env !== undefined) {
			env = parse_key_value_pairs(argv.env);
		} else if (is_interactive) {
			const env_input = await clack.text({
				message: 'Environment variables? (comma-separated KEY=value, or leave empty)',
				placeholder: 'API_KEY=secret, DEBUG=true',
				defaultValue: '',
			});
			if (is_cancel(env_input)) {
				clack.cancel('Operation cancelled');
				process.exit(0);
			}
			env = parse_key_value_pairs(env_input);
		}
	} else {
		// URL
		url = argv.url;
		if (!url) {
			const url_input = await clack.text({
				message: 'What is the server URL?',
				placeholder: 'https://mcp.example.com/sse',
				validate: (value) => {
					if (!value || !value.trim()) return 'URL is required';
					try {
						new URL(value);
					} catch {
						return 'Please enter a valid URL';
					}
				},
			});
			if (is_cancel(url_input)) {
				clack.cancel('Operation cancelled');
				process.exit(0);
			}
			url = url_input;
		}

		// Headers
		if (argv.headers !== undefined) {
			headers = parse_key_value_pairs(argv.headers);
		} else if (is_interactive) {
			const headers_input = await clack.text({
				message: 'HTTP headers? (comma-separated Key=value, or leave empty)',
				placeholder: 'Authorization=Bearer token123',
				defaultValue: '',
			});
			if (is_cancel(headers_input)) {
				clack.cancel('Operation cancelled');
				process.exit(0);
			}
			headers = parse_key_value_pairs(headers_input);
		}
	}

	// Scope
	/** @type {'global' | 'project' | undefined} */
	let scope = /** @type {'global' | 'project' | undefined} */ (argv.scope);
	if (!scope) {
		const scope_input = await clack.select({
			message: 'In which scope to save the configuration?',
			options: [
				{ value: 'global', label: 'Global', hint: 'User-wide configuration' },
				{ value: 'project', label: 'Project', hint: 'Current directory only' },
			],
		});
		if (is_cancel(scope_input)) {
			clack.cancel('Operation cancelled');
			process.exit(0);
		}
		scope = /** @type {'global' | 'project'} */ (scope_input);
	}

	// Clients selection
	/** @type {string[]} */
	let selected_clients = [];
	if (argv.clients !== undefined) {
		selected_clients = parse_comma_separated(argv.clients).filter((c) =>
			client_names.includes(c.toLowerCase()),
		);
	}

	if (selected_clients.length === 0) {
		const clients_input = await clack.multiselect({
			message: 'Which clients should be configured?',
			options: client_names.map((c) => ({
				value: c,
				label: c.charAt(0).toUpperCase() + c.slice(1),
			})),
			required: true,
		});
		if (is_cancel(clients_input)) {
			clack.cancel('Operation cancelled');
			process.exit(0);
		}
		selected_clients = /** @type {string[]} */ (clients_input);
	}

	warn_unused_static_oauth_flag({
		flag_name: 'client-id',
		flag_value: provided_client_id,
		type,
		selected_clients,
		is_interactive,
	});

	warn_unused_static_oauth_flag({
		flag_name: 'client-secret',
		flag_value: provided_client_secret,
		type,
		selected_clients,
		is_interactive,
	});

	const static_oauth_clients =
		type === 'stdio'
			? []
			: selected_clients.filter((client_name) => supports_static_oauth(client_name));

	if (static_oauth_clients.length > 0 && provided_client_id === undefined && is_interactive) {
		const client_id_input = await clack.text({
			message:
				static_oauth_clients.length === 1
					? `${static_oauth_clients[0]} OAuth client ID? (leave empty if not needed)`
					: `OAuth client ID for ${static_oauth_clients.join(', ')}? (leave empty if not needed)`,
			placeholder: 'your-client-id',
			defaultValue: '',
		});
		if (is_cancel(client_id_input)) {
			clack.cancel('Operation cancelled');
			process.exit(0);
		}
		client_id = client_id_input.trim() || undefined;
	}

	if (
		static_oauth_clients.length > 0 &&
		provided_client_secret === undefined &&
		client_id !== undefined &&
		is_interactive
	) {
		const client_secret_input = await clack.text({
			message:
				static_oauth_clients.length === 1
					? `${static_oauth_clients[0]} OAuth client secret? (leave empty if not needed)`
					: `OAuth client secret for ${static_oauth_clients.join(', ')}? (leave empty if not needed)`,
			placeholder: 'your-client-secret',
			defaultValue: '',
		});
		if (is_cancel(client_secret_input)) {
			clack.cancel('Operation cancelled');
			process.exit(0);
		}
		client_secret = client_secret_input.trim() || undefined;
	}

	// Build the configuration object
	/** @type {MCPServerConfig} */
	const config =
		type === 'stdio'
			? {
					name,
					type,
					command: /** @type {string} */ (command),
					args,
					env,
				}
			: {
					name,
					type,
					url: /** @type {string} */ (url),
					headers,
					client_id,
					client_secret,
				};

	const is_global = scope === 'global';

	// Apply configuration to each selected client
	/** @type {Array<{ client: string; success: boolean; path: string; error?: string }>} */
	const results = [];

	if (is_interactive) {
		const spinner = clack.spinner();
		spinner.start('Configuring clients...');

		for (const client_name of selected_clients) {
			const client_fn = clients[client_name.toLowerCase()];
			if (client_fn) {
				const result = await client_fn(config, { is_global });
				results.push({
					client: client_name,
					...result,
				});
			}
		}

		spinner.stop('Configuration complete!');
	} else {
		// Non-interactive mode - just run without spinner
		for (const client_name of selected_clients) {
			const client_fn = clients[client_name.toLowerCase()];
			if (client_fn) {
				const result = await client_fn(config, { is_global });
				results.push({
					client: client_name,
					...result,
				});
			}
		}
	}

	// Display results
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	if (is_interactive) {
		if (successful.length > 0) {
			clack.note(
				successful.map((r) => `${r.client}: ${r.path}`).join('\n'),
				'Successfully configured',
			);
		}

		if (failed.length > 0) {
			clack.note(
				failed.map((r) => `${r.client}: ${r.error}`).join('\n'),
				'Failed to configure',
			);
		}

		clack.outro(
			successful.length === results.length
				? 'All clients configured successfully!'
				: `Configured ${successful.length}/${results.length} clients`,
		);
	} else {
		// Non-interactive output
		for (const result of successful) {
			console.log(`${result.client}: ${result.path}`);
		}
		for (const result of failed) {
			console.error(`${result.client}: ${result.error}`);
		}

		if (failed.length > 0) {
			process.exit(1);
		}
	}
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
