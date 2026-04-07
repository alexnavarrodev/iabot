// BotCard — Overview page tile per design doc §8.1.
// Click anywhere navigates to the bot detail page.

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from './primitives/card';
import { Mono } from './primitives/mono';
import { StatusPill } from './primitives/status-pill';
import { Delta } from './primitives/delta';
import { Sparkline } from './charts/sparkline';
import { api } from '@/lib/api-client';
import {
  formatPercent,
  formatPnl,
  formatSize,
  formatUsd,
} from '@/lib/format';
import type { BotSummary } from '@/lib/api-types';

interface BotCardProps {
  bot: BotSummary;
  // Live tick override (from WS).
  tick?: {
    status: BotSummary['status'];
    positionSize: number;
    avgEntryPrice: number;
    gridProfit: number;
    trendPnl: number;
    totalPnl: number;
  } | null;
}

export function BotCard({ bot, tick }: BotCardProps) {
  // Pull last 30 days of snapshots for the sparkline. Cheap query (≤30 rows).
  const snapshots = useQuery({
    queryKey: ['snapshots', bot.id],
    queryFn: () => api.getSnapshots(bot.id),
    staleTime: 5 * 60_000, // 5 min — daily snapshots only update once/day
  });

  const sparkData = (snapshots.data?.snapshots ?? [])
    .slice(0, 30)
    .reverse()
    .map((s) => ({ value: s.equity_usdt }));

  const status = tick?.status ?? bot.status;
  const totalPnl = tick?.totalPnl ?? bot.total_pnl_usdt;
  const gridProfit = tick?.gridProfit ?? bot.grid_profit_usdt;
  const trendPnl = tick?.trendPnl ?? bot.trend_pnl_usdt;
  const positionSize = tick?.positionSize ?? bot.position_size;
  const avgEntry = tick?.avgEntryPrice ?? bot.avg_entry_price;
  const equity = bot.investment_usdt + totalPnl;
  const equityPct = (totalPnl / bot.investment_usdt) * 100;

  return (
    <Link
      to={`/bots/${bot.id}`}
      className="block hover:no-underline focus-visible:outline-none"
    >
      <Card className="hover:border-border-default cursor-pointer p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {bot.pair}
            </h3>
            <p className="text-2xs uppercase tracking-wider text-text-muted mt-0.5">
              {bot.direction} · {bot.leverage}x
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        {/* Equity hero */}
        <div className="mb-1">
          <span className="text-2xs uppercase tracking-wider text-text-muted">
            Equity
          </span>
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <Mono className="text-2xl font-semibold text-text-primary">
            {formatUsd(equity)}
          </Mono>
          <Delta value={equityPct} format={formatPercent} />
        </div>

        {/* Sparkline */}
        <div className="mb-4">
          <Sparkline data={sparkData} />
        </div>

        {/* Stats grid */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <SummaryRow
            label="Position"
            value={`${formatSize(positionSize)} @ ${formatUsd(avgEntry)}`}
          />
          <SummaryRow
            label="Range"
            value={`${formatUsd(bot.lower_price)}–${formatUsd(bot.upper_price)}`}
          />
          <SummaryRow label="Grids" value={`${bot.num_grids} levels`} />
          <SummaryRow label="Realized" value={formatPnl(gridProfit)} />
          <SummaryRow label="Unrealized" value={formatPnl(trendPnl)} />
          <SummaryRow label="Investment" value={formatUsd(bot.investment_usdt)} />
        </dl>
      </Card>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-2xs uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="font-mono tabular-nums text-text-secondary truncate">
        {value}
      </dd>
    </div>
  );
}
