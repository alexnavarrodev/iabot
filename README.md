# GRVT Grid

Self-hosted real-time dashboard for grid trading bots on the GRVT perpetual futures exchange.

## Status

Phase B in progress. The bot itself (Phase A) is already running in production. See `docs/design/DESIGN_LANGUAGE.md` for the design language and `../helbreath-hbx/.claude/plans/virtual-splashing-ocean.md` for the master plan.

## Structure

```
packages/
  bot/        # Engine + REST + WebSocket server (refactor of /opt/grvt-grid-bot)
  dashboard/  # SPA frontend (Vite + React + Tailwind + shadcn)
  notifier/   # Standalone Telegram alerts worker
scripts/      # Install + deploy
docs/         # Design language + protocol + ops
```

## Development

Each package has its own README. Start there.
