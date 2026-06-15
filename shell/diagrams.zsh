# mermaid-live-viewer control function. Source this from ~/.zshrc:
#   source /path/to/mermaid-live-viewer/shell/diagrams.zsh
#
# usage: diagrams {start|stop|restart|status|logs|open}
diagrams() {
  local dir="${DIAGRAMS_DIR:-$HOME/diagrams}"
  local port="${DIAGRAMS_PORT:-4242}"
  local url="http://localhost:$port"
  local log="${TMPDIR:-/tmp}/diagram-viewer.log"

  case "$1" in
    start)
      if curl -sf -o /dev/null "$url/"; then
        echo "already running -> $url"
      else
        PORT="$port" DIAGRAMS_ROOT="$dir" nohup bun "$dir/server.js" >"$log" 2>&1 & disown
        sleep 0.4
        curl -sf -o /dev/null "$url/" && echo "started -> $url" || echo "failed; see $log"
      fi ;;
    stop)
      local pid
      if command -v lsof >/dev/null; then pid=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null)
      elif command -v fuser >/dev/null; then pid=$(fuser "$port/tcp" 2>/dev/null)
      else pid=$(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1); fi
      [[ -n "$pid" ]] && { kill $pid && echo "stopped"; } || echo "not running" ;;
    restart) diagrams stop; sleep 0.3; diagrams start ;;
    status)  curl -sf -o /dev/null "$url/" && echo "running -> $url" || echo "stopped" ;;
    logs)    tail -f "$log" ;;
    open)    command -v xdg-open >/dev/null && xdg-open "$url" >/dev/null 2>&1 || echo "$url" ;;
    *)       echo "usage: diagrams {start|stop|restart|status|logs|open}" ;;
  esac
}
