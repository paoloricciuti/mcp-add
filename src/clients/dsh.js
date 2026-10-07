/** @import { MCPServerConfig, AddOptions, AddResult } from './types.js' */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import YAML from 'yaml';

/**
 * Gets the DSH (DeepSeek Harness) home patch config file path.
 * DSH reads `$DSH_HOME/cordis.patch.yml`, defaulting to `~/.dsh/cordis.patch.yml`.
 * @returns {string} The config file path
 */
function get_config_path() {
	const dsh_home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
	return path.join(dsh_home, 'cordis.patch.yml');
}

/**
 * Reads the existing DSH patch layer or returns an empty list
 * @param {string} config_path - Path to the config file
 * @returns {Array<Record<string, unknown>>} The parsed patch rows
 */
function read_config(config_path) {
	try {
		if (fs.existsSync(config_path)) {
			const content = fs.readFileSync(config_path, 'utf-8');
			const parsed = YAML.parse(content);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		}
	} catch {
		// If file doesn't exist or is invalid, start fresh
	}
	return [];
}

/**
 * Transforms the generic MCP config to a DSH dsh-mcp-client row config
 * @param {MCPServerConfig} config - The generic server config
 * @returns {Record<string, unknown>} The row's `config` object
 */
function transform_config(config) {
	/** @type {Record<string, unknown>} */
	const result = {
		serverName: config.name,
	};
	if (config.type === 'stdio') {
		result.transport = 'stdio';
		result.command = config.command;
		result.args = config.args || [];
		if (config.env && Object.keys(config.env).length > 0) {
			result.env = config.env;
		}
	} else {
		// DSH's dsh-mcp-client only exposes stdio and Streamable HTTP transports
		result.transport = 'streamable-http';
		result.url = config.url;
		if (config.headers && Object.keys(config.headers).length > 0) {
			result.headers = config.headers;
		}
	}
	return result;
}

/**
 * Adds an MCP server configuration to DSH (DeepSeek Harness)
 * @param {MCPServerConfig} config - The server configuration
 * @param {AddOptions} _options - Additional options (unused for DSH)
 * @returns {Promise<AddResult>} Result of the operation
 */
export async function add_to_dsh(config, _options) {
	const config_path = get_config_path();

	try {
		// Ensure directory exists
		const dir = path.dirname(config_path);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Read existing patch rows
		const rows = read_config(config_path);

		const new_row = {
			id: `mcp-${config.name}`,
			name: '@deepseek-ai/dsh-mcp-client',
			config: transform_config(config),
		};

		// Replace an existing row with the same id, otherwise append
		const existing_index = rows.findIndex((row) => row.id === new_row.id);
		if (existing_index >= 0) {
			rows[existing_index] = new_row;
		} else {
			rows.push(new_row);
		}

		// Write the config as YAML
		fs.writeFileSync(config_path, YAML.stringify(rows));

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
