/** @import { MCPServerConfig, AddOptions, AddResult } from './types.js' */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as TOML from 'smol-toml';

/**
 * Gets the Codex CLI config file path based on scope
 * - Global scope: ~/.codex/config.toml
 * - Project scope: .codex/config.toml in the current directory
 * @param {boolean} is_global - Whether to use global config
 * @returns {string} The config file path
 */
function get_config_path(is_global) {
	if (is_global) {
		return path.join(os.homedir(), '.codex', 'config.toml');
	}
	return path.join(process.cwd(), '.codex', 'config.toml');
}

/**
 * Reads the existing Codex config or returns empty config
 * @param {string} config_path - Path to the config file
 * @returns {Record<string, unknown>} The parsed config
 */
function read_config(config_path) {
	try {
		if (fs.existsSync(config_path)) {
			const content = fs.readFileSync(config_path, 'utf-8');
			return TOML.parse(content);
		}
	} catch {
		// If file doesn't exist or is invalid, start fresh
	}
	return {};
}

/**
 * Transforms the generic MCP config to Codex format
 * @param {MCPServerConfig} config - The generic server config
 * @returns {Record<string, unknown>} Codex formatted config entry
 */
function transform_config(config) {
	if (config.type === 'stdio') {
		/** @type {Record<string, unknown>} */
		const result = {
			command: config.command,
			args: config.args || [],
		};
		if (config.env && Object.keys(config.env).length > 0) {
			result.env = config.env;
		}
		return result;
	} else {
		/** @type {Record<string, unknown>} */
		const result = {
			url: config.url,
		};
		if (config.headers && Object.keys(config.headers).length > 0) {
			result.http_headers = config.headers;
		}
		return result;
	}
}

/**
 * Adds an MCP server configuration to Codex CLI
 * @param {MCPServerConfig} config - The server configuration
 * @param {AddOptions} options - Additional options
 * @returns {Promise<AddResult>} Result of the operation
 */
export async function add_to_codex(config, options) {
	const config_path = get_config_path(options.is_global);

	try {
		// Ensure the config directory exists for either scope.
		const dir = path.dirname(config_path);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

		// Read existing config
		const existing_config = read_config(config_path);

		// Ensure mcp_servers object exists
		if (!existing_config.mcp_servers) {
			existing_config.mcp_servers = {};
		}

		// Add the new server
		const mcp_servers = /** @type {Record<string, unknown>} */ (existing_config.mcp_servers);
		mcp_servers[config.name] = transform_config(config);

		// Write the config as TOML
		fs.writeFileSync(config_path, TOML.stringify(existing_config));

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
