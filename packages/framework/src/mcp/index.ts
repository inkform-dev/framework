/** Framework-native MCP: self-hostable server + the underlying tool core. */
export { createMcpHandler, type CreateMcpHandlerOptions } from './server';
export {
  getDoc,
  getOperation,
  listOperations,
  search,
  type McpOperationSummary,
  type McpSearchResult,
} from './tools';
