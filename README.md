# MCP Workbench

React + Vite MCP client console using the official TypeScript SDK:

```json
"@modelcontextprotocol/sdk": "^1.29.0"
```

The browser client uses Streamable HTTP:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
```

## Run

```bash
npm install
npm run dev
```

The app runs on:

```text
http://localhost:5175
```

## Federated Component

This app is exposed as a Module Federation remote, matching the `assistant-ui-chat`
shape:

```text
remote: mcp_workbench
entry:  http://localhost:5175/remoteEntry.js
expose: ./App
```

The exposed React component accepts optional props:

```ts
type McpConsoleProps = {
  title?: string;
  subtitle?: string;
  defaultEndpoint?: string;
  clientName?: string;
  clientVersion?: string;
};
```

## MCP Configurator

The header includes an **MCP Configurator** panel for browser-level settings:

- MCP server URL
- Transport mode
- MCP client name and version
- Interface title and subtitle

Settings are stored in browser `localStorage` under:

```text
mcp-workbench:config
```

When the app reloads, MCP Workbench reads that saved configuration first and
uses it as the active connection/interface setup.

## MCP Endpoint

The UI connects to a relative endpoint by default:

```text
/mcp/tools
```

Vite proxies that endpoint to:

```text
http://localhost:8080/mcp/tools
```

Configure with:

```env
VITE_PORT=5175
VITE_REMOTE_PORT=5175
VITE_REMOTE_ORIGIN=http://localhost:5175
VITE_MCP_TARGET=http://localhost:8080
VITE_MCP_ENDPOINT=/mcp/tools
```

React cannot directly run stdio MCP servers in the browser. For browser React/Vite,
use HTTP or Streamable HTTP through a backend endpoint:

```text
React UI -> /mcp/tools -> Vite proxy -> http://localhost:8080/mcp/tools
```

## Features

- Connects with `StreamableHTTPClientTransport`
- Persists MCP configuration in browser `localStorage`
- Discovers tools via `client.listTools()`
- Displays discovered tool count and input schema
- Calls tools via `client.callTool()`
- Shows the latest MCP response as formatted JSON
