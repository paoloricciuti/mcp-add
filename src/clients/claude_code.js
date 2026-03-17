/** @import { MCPServerConfig, AddOptions, AddResult } from './types.js' */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Gets the Claude Code config file path based on scope
 * - User scope: ~/.claude.json
 * - Project scope: .mcp.json in current directory
 * @param {boolean} is_global - Whether to use global config
 * @returns {string} The config file path
 */
function get_config_path(is_global) {
	if (is_global) {
		return path.join(os.homedir(), '.claude.json');
	} else {
		return path.join(process.cwd(), '.mcp.json');
	}
}

/**
 * Reads the existing Claude Code config or returns empty config
 * @param {string} config_path - Path to the config file
 * @returns {Record<string, unknown>} The parsed config
 */
function read_config(config_path) {
	try {
		if (fs.existsSync(config_path)) {
			const content = fs.readFileSync(config_path, 'utf-8');
			return JSON.parse(content);
		}
	} catch {
		// If file doesn't exist or is invalid, start fresh
	}
	return {};
}

/**
 * Transforms the generic MCP config to Claude Code format
 * @param {MCPServerConfig} config - The generic server config
 * @returns {Record<string, unknown>} Claude Code formatted config
 */
function transform_config(config) {
	if (config.type === 'stdio') {
		/** @type {Record<string, unknown>} */
		const result = {
			command: config.command,
			args: config.args || [],
			type: config.type,
		};
		if (config.env && Object.keys(config.env).length > 0) {
			result.env = config.env;
		}
		return result;
	} else {
		// Remote server config
		/** @type {Record<string, unknown>} */
		const result = {
			url: config.url,
			type: config.type,
		};
		if (config.headers && Object.keys(config.headers).length > 0) {
			result.headers = config.headers;
		}
		if (config.client_id) {
			result.oauth = {
				clientId: config.client_id,
			};
		}
		return result;
	}
}

/**
 * Adds an MCP server configuration to Claude Code
 * @param {MCPServerConfig} config - The server configuration
 * @param {AddOptions} options - Additional options
 * @returns {Promise<AddResult>} Result of the operation
 */
export async function add_to_claude_code(config, options) {
	const config_path = get_config_path(options.is_global);

	try {
		// Ensure directory exists (only needed for global config)
		if (options.is_global) {
			const dir = path.dirname(config_path);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		}

		// Read existing config
		const existing_config = read_config(config_path);

		// Ensure mcpServers object exists
		if (!existing_config.mcpServers) {
			existing_config.mcpServers = {};
		}

		// Add the new server
		const mcp_servers = /** @type {Record<string, unknown>} */ (existing_config.mcpServers);
		mcp_servers[config.name] = transform_config(config);

		// Write the config
		fs.writeFileSync(config_path, JSON.stringify(existing_config, null, 2) + '\n');

		return {
			success: true,
			path: config_path,
		};
	} catch (err) {
		return {
			success: false,
			path: config_path,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
