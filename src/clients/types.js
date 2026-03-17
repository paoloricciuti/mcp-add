/**
 * @typedef {object} LocalServerConfig
 * @property {string} name - Server name/identifier
 * @property {'stdio'} type - Server type
 * @property {string} command - Command to run
 * @property {string[]} args - Command arguments
 * @property {Record<string, string>} [env] - Environment variables
 */

/**
 * @typedef {object} RemoteServerConfig
 * @property {string} name - Server name/identifier
 * @property {'http' | 'sse'} type - Server type (http or sse)
 * @property {string} url - Server URL
 * @property {Record<string, string>} [headers] - HTTP headers
 * @property {string} [client_id] - Static OAuth client ID for clients that need it
 */

/**
 * @typedef {LocalServerConfig | RemoteServerConfig} MCPServerConfig
 */

/**
 * @typedef {object} AddOptions
 * @property {boolean} is_global - Whether to use global or project config
 */

/**
 * @typedef {object} AddResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} path - Path to the config file
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {(config: MCPServerConfig, options: AddOptions) => Promise<AddResult>} ClientAddFunction
 */

export {};
