# 钩子共用：钩子可能从图形客户端或 Agent 的 shell 启动，那里不一定有 Node 24
use_project_node() {
  local want
  want="$(cat .nvmrc)"
  if node -v 2>/dev/null | grep -q "^v${want}\."; then
    return 0
  fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" >/dev/null
    nvm use >/dev/null || return 1
    return 0
  fi
  echo "钩子需要 Node ${want}，当前是 $(node -v 2>/dev/null || echo 无)" >&2
  return 1
}
