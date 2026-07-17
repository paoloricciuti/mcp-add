/** @import { MCPServerConfig, AddOptions, AddResult, ClientAddFunction } from './types.js' */

import { add_to_antigravity } from './antigravity.js';
import { add_to_claude } from './claude.js';
import { add_to_claude_code } from './claude_code.js';
import { add_to_copilot_cli } from './copilot_cli.js';
import { add_to_cursor } from './cursor.js';
import { add_to_continue } from './continue.js';
import { add_to_windsurf } from './windsurf.js';
import { add_to_opencode } from './opencode.js';
import { add_to_vscode } from './vscode.js';
import { add_to_goose } from './goose.js';
import { add_to_codex } from './codex.js';
import { add_to_gemini } from './gemini.js';

/**
 * Map of client names to their add functions
 * @type {Record<string, ClientAddFunction>}
 */
export const clients = {
	antigravity: add_to_antigravity,
	'claude desktop': add_to_claude,
	'claude code': add_to_claude_code,
	'copilot cli': add_to_copilot_cli,
	cursor: add_to_cursor,
	continue: add_to_continue,
	windsurf: add_to_windsurf,
	opencode: add_to_opencode,
	vscode: add_to_vscode,
	goose: add_to_goose,
	codex: add_to_codex,
	gemini: add_to_gemini,
};

/**
 * Clients that support configuring static OAuth credentials for remote servers
 * @type {string[]}
 */
export const clients_supporting_static_oauth = ['claude code', 'cursor'];

/**
 * List of available client names for display
 * @type {string[]}
 */
export const client_names = Object.keys(clients).sort((a, b) => a.localeCompare(b));
