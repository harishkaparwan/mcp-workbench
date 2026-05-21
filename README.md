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

Clone the repository:

```bash
git clone https://github.com/harishkaparwan/mcp-workbench.git
cd mcp-workbench
```

Install dependencies:

```bash
npm install
```

Start the local Vite app:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:5175
```

Open that URL in your browser.

## Container Images

Build the static app and container image locally:

```bash
npm run build
podman build --format docker -t docker.io/harishkaparwan/mcp-workbench:latest -t ghcr.io/harishkaparwan/mcp-workbench:latest .
```

Run the local image:

```bash
podman run --rm -p 8080:80 docker.io/harishkaparwan/mcp-workbench:latest
```

Then open:

```text
http://localhost:8080
```

Run from Docker Hub:

```bash
podman pull docker.io/harishkaparwan/mcp-workbench:latest
podman run --rm -p 8080:80 docker.io/harishkaparwan/mcp-workbench:latest
```

Run from GitHub Container Registry:

```bash
podman pull ghcr.io/harishkaparwan/mcp-workbench:latest
podman run --rm -p 8080:80 ghcr.io/harishkaparwan/mcp-workbench:latest
```

## Connect to an MCP Server

MCP Workbench connects to MCP servers that expose an HTTP or Streamable HTTP
endpoint. After the app is running:

1. Click **MCP Configurator** in the top navigation.
2. Set **MCP Server URL** to your server endpoint.
3. Add any required **Request Headers JSON**.
4. Set the client name/version if your server expects specific metadata.
5. Set optional interface title/subtitle labels.
6. Set optional **Default Tool Arguments JSON**.
7. Click **Save configuration**.
8. Click the refresh/connect button beside the server URL.
9. Select a discovered tool, edit the arguments JSON, and click **Call tool**.

Example local MCP endpoint:

```text
http://localhost:8080/mcp/tools
```

Example headers for an authenticated server:

```json
{
  "Authorization": "Bearer token",
  "X-Tenant-Id": "tenant-a"
}
```

Example default tool arguments:

```json
{
  "query": "list available records",
  "limit": 10
}
```

The configurator stores settings in browser `localStorage`, so the same browser
remembers the connection on reload.

## Server Requirements

The MCP server must be reachable from the browser. For local development, this
usually means one of these setups:

- The MCP server allows browser CORS requests directly.
- The Vite dev server proxies `/mcp` requests to the MCP server.
- A backend bridge exposes a browser-safe HTTP endpoint for a stdio MCP server.

Browsers cannot directly run or connect to stdio MCP servers. If your MCP server
is stdio-based, run it behind a backend bridge and point MCP Workbench to that
HTTP endpoint.

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
- Request headers JSON
- MCP client name and version
- Interface title and subtitle
- Default tool arguments JSON

Settings are stored in browser `localStorage` under:

```text
mcp-workbench:config
```

When the app reloads, MCP Workbench reads that saved configuration first and
uses it as the active connection/interface setup.

Use request headers for server-specific authentication or routing metadata:

```json
{
  "Authorization": "Bearer token",
  "X-Tenant-Id": "tenant-a"
}
```

Default tool arguments should be a JSON object. The workbench uses it as the
initial body for tool calls, and users can edit it before each call.

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
