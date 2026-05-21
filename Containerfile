FROM nginx:1.29-alpine

LABEL org.opencontainers.image.source="https://github.com/harishkaparwan/mcp-workbench"
LABEL org.opencontainers.image.description="MCP Workbench browser client"
LABEL org.opencontainers.image.licenses="MIT"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
