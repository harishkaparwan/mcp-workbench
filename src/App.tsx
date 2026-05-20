import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  Activity,
  Braces,
  Cable,
  DatabaseZap,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import "./styles.css";

const DEFAULT_ENDPOINT = import.meta.env.VITE_MCP_ENDPOINT || "/mcp/tools";
const DEFAULT_CLIENT_NAME = "mcp-workbench";
const DEFAULT_CLIENT_VERSION = "0.0.0";
const DEFAULT_TITLE = "MCP Workbench";
const DEFAULT_SUBTITLE = "Connect, inspect, and operate any streamable HTTP MCP server from one professional interface.";
const CONFIG_STORAGE_KEY = "mcp-workbench:config";
const DEFAULT_ARGUMENTS = JSON.stringify(
  {
    message: "Hello from React Vite",
  },
  null,
  2,
);

type McpTool = {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
  };
};

type Status = "idle" | "connecting" | "connected" | "calling" | "error";

type WorkbenchConfig = {
  serverUrl: string;
  clientName: string;
  clientVersion: string;
  title: string;
  subtitle: string;
  transport: "streamable-http";
};

export type McpConsoleProps = {
  title?: string;
  subtitle?: string;
  defaultEndpoint?: string;
  clientName?: string;
  clientVersion?: string;
};

export default function App({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  defaultEndpoint = DEFAULT_ENDPOINT,
  clientName = DEFAULT_CLIENT_NAME,
  clientVersion = DEFAULT_CLIENT_VERSION,
}: McpConsoleProps) {
  const defaultConfig = useMemo(
    () => ({
      serverUrl: defaultEndpoint,
      clientName,
      clientVersion,
      title,
      subtitle,
      transport: "streamable-http" as const,
    }),
    [clientName, clientVersion, defaultEndpoint, subtitle, title],
  );
  const [config, setConfig] = useState<WorkbenchConfig>(() => ({
    ...defaultConfig,
    ...readStoredConfig(),
  }));
  const [draftConfig, setDraftConfig] = useState<WorkbenchConfig>(config);
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [tools, setTools] = useState<McpTool[]>([]);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [argumentsText, setArgumentsText] = useState(DEFAULT_ARGUMENTS);
  const [resultText, setResultText] = useState("{}");
  const [error, setError] = useState("");
  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<StreamableHTTPClientTransport | null>(null);

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === selectedToolName),
    [selectedToolName, tools],
  );

  const schemaText = selectedTool
    ? JSON.stringify(selectedTool.inputSchema, null, 2)
    : "{}";

  async function connect() {
    setStatus("connecting");
    setError("");

    try {
      await transportRef.current?.close().catch(() => undefined);

      const endpoint = new URL(config.serverUrl, window.location.origin);
      const transport = new StreamableHTTPClientTransport(endpoint);
      const client = new Client({
        name: config.clientName,
        version: config.clientVersion,
      });

      await client.connect(transport);
      const list = await client.listTools();
      const nextTools = list.tools;

      transportRef.current = transport;
      clientRef.current = client;
      setTools(nextTools);
      setSelectedToolName((current) => current || nextTools[0]?.name || "");
      setStatus("connected");
    } catch (caughtError) {
      setStatus("error");
      setTools([]);
      setSelectedToolName("");
      setResultText("{}");
      setError(toErrorMessage(caughtError));
    }
  }

  async function callSelectedTool() {
    if (!clientRef.current || !selectedTool) return;

    setStatus("calling");
    setError("");

    try {
      const parsedArguments = JSON.parse(argumentsText) as Record<string, unknown>;
      const result = await clientRef.current.callTool({
        name: selectedTool.name,
        arguments: parsedArguments,
      });
      setResultText(JSON.stringify(result, null, 2));
      setStatus("connected");
    } catch (caughtError) {
      setStatus("error");
      setError(toErrorMessage(caughtError));
    }
  }

  function openConfigurator() {
    setDraftConfig(config);
    setIsConfiguratorOpen(true);
  }

  function saveConfigurator() {
    const nextConfig = normalizeConfig(draftConfig, defaultConfig);
    setConfig(nextConfig);
    writeStoredConfig(nextConfig);
    setIsConfiguratorOpen(false);
  }

  function resetConfigurator() {
    setDraftConfig(defaultConfig);
  }

  function updateServerUrl(serverUrl: string) {
    const nextConfig = { ...config, serverUrl };
    setConfig(nextConfig);
    writeStoredConfig(nextConfig);
  }

  const isBusy = status === "connecting" || status === "calling";
  const canCall = status === "connected" && Boolean(selectedTool);

  return (
    <main className="app-shell">
      <div className="top-strip" />
      <nav className="app-nav" aria-label="Primary navigation">
        <a className="brand-mark" href="#connect">
          <span className="brand-icon">
            <DatabaseZap size={19} />
          </span>
          <span>
            <strong>MCP Workbench</strong>
            <small>Universal MCP interface</small>
          </span>
        </a>

        <NavLinks onOpenConfigurator={openConfigurator} />
      </nav>

      <header className="hero">
        <div>
         
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div className="hero-actions">
          <div className="endpoint-chip">
            <Activity size={17} />
            <span>{config.serverUrl}</span>
          </div>
          <StatusBadge status={status} />
        </div>
      </header>

      <section className="workspace">
        <aside className="card connection-card" id="connect">
          <SectionTitle
            icon={<Cable size={19} />}
            title="Connection"
            subtitle="HTTP endpoint and discovered tools."
          />

          <label className="field-label" htmlFor="server-url">
            Server URL
          </label>
          <div className="server-row">
            <input
              id="server-url"
              value={config.serverUrl}
              onChange={(event) => updateServerUrl(event.target.value)}
              className="input"
              spellCheck={false}
            />
            <button
              type="button"
              className="icon-button primary"
              onClick={connect}
              disabled={isBusy}
              aria-label="Connect to MCP server"
            >
              {status === "connecting" ? (
                <LoaderCircle className="spin" size={22} />
              ) : (
                <RefreshCw size={22} />
              )}
            </button>
          </div>

          <div className="tools-heading" id="tools">
            <span>Tools</span>
            <span className="count">{tools.length}</span>
          </div>

          <div className="tools-list">
            {tools.length === 0 ? (
              <div className="empty-tools">No tools loaded.</div>
            ) : (
              tools.map((tool) => (
                <button
                  key={tool.name}
                  type="button"
                  className={
                    tool.name === selectedToolName ? "tool active" : "tool"
                  }
                  onClick={() => setSelectedToolName(tool.name)}
                >
                  <span>{tool.name}</span>
                  {tool.description ? <small>{tool.description}</small> : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="main-column">
          <div className="card tool-card">
            <SectionTitle
              icon={<Braces size={20} />}
              title="Tool call"
              subtitle={
                selectedTool
                  ? `Ready to call ${selectedTool.name}.`
                  : "Connect to an MCP server first."
              }
            />

            <div className="tool-select-row">
              <label className="field-label" htmlFor="tool-select">
                Tool
              </label>
              <select
                id="tool-select"
                className="select"
                value={selectedToolName}
                onChange={(event) => setSelectedToolName(event.target.value)}
                disabled={tools.length === 0}
              >
                <option value="">No tool selected</option>
                {tools.map((tool) => (
                  <option key={tool.name} value={tool.name}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-grid">
              <div>
                <label className="field-label" htmlFor="arguments">
                  Arguments
                </label>
                <textarea
                  id="arguments"
                  className="code-area light"
                  value={argumentsText}
                  onChange={(event) => setArgumentsText(event.target.value)}
                  spellCheck={false}
                />
              </div>

              <div id="schema">
                <label className="field-label" htmlFor="input-schema">
                  Input schema
                </label>
                <pre id="input-schema" className="code-area dark">
                  {schemaText}
                </pre>
              </div>
            </div>

            <button
              type="button"
              className="call-button"
              disabled={!canCall || isBusy}
              onClick={callSelectedTool}
            >
              {status === "calling" ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <Play size={20} />
              )}
              <span>Call tool</span>
            </button>

            {error ? <div className="error-panel">{error}</div> : null}
          </div>

          <div className="card result-card" id="result">
            <SectionTitle title="Result" subtitle="Latest MCP response." />
            <pre className="result-box">{resultText}</pre>
          </div>
        </section>
      </section>

      {isConfiguratorOpen ? (
        <McpConfigurator
          config={draftConfig}
          onChange={setDraftConfig}
          onClose={() => setIsConfiguratorOpen(false)}
          onReset={resetConfigurator}
          onSave={saveConfigurator}
        />
      ) : null}
    </main>
  );
}

function NavLinks({ onOpenConfigurator }: { onOpenConfigurator: () => void }) {
  return (
    <div className="nav-links">
      <a href="#connect">Connect</a>
      <a href="#tools">Tools</a>
      <a href="#schema">Schema</a>
      <a href="#result">Result</a>
      <button type="button" onClick={onOpenConfigurator}>
        <Settings size={16} />
        <span>MCP Configurator</span>
      </button>
    </div>
  );
}

function McpConfigurator({
  config,
  onChange,
  onClose,
  onReset,
  onSave,
}: {
  config: WorkbenchConfig;
  onChange: (config: WorkbenchConfig) => void;
  onClose: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  function updateField<Key extends keyof WorkbenchConfig>(
    key: Key,
    value: WorkbenchConfig[Key],
  ) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="configurator-backdrop" role="presentation">
      <section
        className="configurator-panel"
        aria-labelledby="configurator-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="configurator-header">
          <div>
            <span className="configurator-kicker">Settings</span>
            <h2 id="configurator-title">MCP Configurator</h2>
            <p>Saved in this browser and reused when MCP Workbench loads.</p>
          </div>
          <button
            type="button"
            className="icon-button subtle"
            onClick={onClose}
            aria-label="Close MCP Configurator"
          >
            <X size={20} />
          </button>
        </div>

        <div className="configurator-grid">
          <div className="config-field wide">
            <label htmlFor="config-server-url">MCP Server URL</label>
            <input
              id="config-server-url"
              value={config.serverUrl}
              onChange={(event) => updateField("serverUrl", event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="config-field">
            <label htmlFor="config-transport">Transport</label>
            <select
              id="config-transport"
              value={config.transport}
              onChange={(event) =>
                updateField(
                  "transport",
                  event.target.value as WorkbenchConfig["transport"],
                )
              }
            >
              <option value="streamable-http">Streamable HTTP</option>
            </select>
          </div>

          <div className="config-field">
            <label htmlFor="config-client-version">Client Version</label>
            <input
              id="config-client-version"
              value={config.clientVersion}
              onChange={(event) => updateField("clientVersion", event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="config-field">
            <label htmlFor="config-client-name">Client Name</label>
            <input
              id="config-client-name"
              value={config.clientName}
              onChange={(event) => updateField("clientName", event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="config-field">
            <label htmlFor="config-title">Interface Title</label>
            <input
              id="config-title"
              value={config.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>

          <div className="config-field wide">
            <label htmlFor="config-subtitle">Interface Subtitle</label>
            <textarea
              id="config-subtitle"
              value={config.subtitle}
              onChange={(event) => updateField("subtitle", event.target.value)}
            />
          </div>
        </div>

        <div className="configurator-actions">
          <button type="button" className="secondary-action" onClick={onReset}>
            <RotateCcw size={17} />
            <span>Reset defaults</span>
          </button>
          <button type="button" className="call-button" onClick={onSave}>
            <Save size={18} />
            <span>Save configuration</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="section-title">
      {icon ? <span className="title-icon">{icon}</span> : null}
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "connecting"
      ? "Connecting"
      : status === "connected"
        ? "Connected"
        : status === "calling"
          ? "Calling"
          : status === "error"
            ? "Error"
            : "Idle";

  return <span className={`status-badge ${status}`}>{label}</span>;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown MCP client error";
}

function readStoredConfig() {
  if (typeof window === "undefined" || !("localStorage" in window)) return {};

  try {
    const storedConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!storedConfig) return {};

    const parsedConfig = JSON.parse(storedConfig) as Partial<WorkbenchConfig>;
    const nextConfig: Partial<WorkbenchConfig> = {};

    if (parsedConfig.serverUrl) nextConfig.serverUrl = parsedConfig.serverUrl;
    if (parsedConfig.clientName) nextConfig.clientName = parsedConfig.clientName;
    if (parsedConfig.clientVersion) {
      nextConfig.clientVersion = parsedConfig.clientVersion;
    }
    if (parsedConfig.title) nextConfig.title = parsedConfig.title;
    if (parsedConfig.subtitle) nextConfig.subtitle = parsedConfig.subtitle;
    if (parsedConfig.transport === "streamable-http") {
      nextConfig.transport = parsedConfig.transport;
    }

    return nextConfig;
  } catch {
    return {};
  }
}

function writeStoredConfig(config: WorkbenchConfig) {
  if (typeof window === "undefined" || !("localStorage" in window)) return;

  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function normalizeConfig(
  config: WorkbenchConfig,
  fallbackConfig: WorkbenchConfig,
): WorkbenchConfig {
  return {
    serverUrl: config.serverUrl.trim() || fallbackConfig.serverUrl,
    clientName: config.clientName.trim() || fallbackConfig.clientName,
    clientVersion: config.clientVersion.trim() || fallbackConfig.clientVersion,
    title: config.title.trim() || fallbackConfig.title,
    subtitle: config.subtitle.trim() || fallbackConfig.subtitle,
    transport: "streamable-http",
  };
}
