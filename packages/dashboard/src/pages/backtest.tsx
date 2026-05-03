// H.6 — Backtest page.
// Pure simulation against historical GRVT candles. No orders are placed.
// Form on the left, result on the right (or stacked on mobile).
//
// "Apply to wizard" navigates to / with the inputs in router state, which
// OverviewPage reads to open the create-bot-wizard pre-filled.

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { StatCard } from '@/components/primitives/stat-card';
import { EquityCurve, type EquityPoint } from '@/components/charts/equity-curve';
import { formatPercent, formatPnl, formatUsdCompact } from '@/lib/format';
import type {
  BacktestInput,
  BacktestResult,
  CandleInterval,
} from '@/lib/api-types';

interface FormState {
  pair: string;
  direction: 'long' | 'short';
  leverage: string;
  lower: string;
  upper: string;
  grids: string;
  investment: string;
  feePct: string;
  interval: CandleInterval;
  limit: string;
}

const INITIAL: FormState = {
  pair: 'ETH_USDT_Perp',
  direction: 'long',
  leverage: '5',
  lower: '',
  upper: '',
  grids: '40',
  investment: '500',
  feePct: '0.05',
  interval: 'CI_1_H',
  limit: '500',
};

const INTERVALS: Array<{ value: CandleInterval; label: string }> = [
  { value: 'CI_15_M', label: '15 min' },
  { value: 'CI_30_M', label: '30 min' },
  { value: 'CI_1_H', label: '1 hour' },
  { value: 'CI_4_H', label: '4 hours' },
  { value: 'CI_1_D', label: '1 day' },
];

const FALLBACK_PAIRS = [
  { value: 'ETH_USDT_Perp', label: 'ETH-USDT-Perp' },
  { value: 'BTC_USDT_Perp', label: 'BTC-USDT-Perp' },
  { value: 'SOL_USDT_Perp', label: 'SOL-USDT-Perp' },
];

export function BacktestPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const navigate = useNavigate();

  const instrumentsQuery = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.getInstruments(),
    staleTime: 60_000,
  });

  const pairs = instrumentsQuery.data?.instruments
    ? (instrumentsQuery.data.instruments as Array<Record<string, unknown>>)
        .map((i) => (i.instrument ?? i.symbol ?? i.name) as string)
        .filter((name) => typeof name === 'string' && name.includes('_Perp'))
        .map((name) => ({ value: name, label: name.replace(/_/g, '-') }))
    : FALLBACK_PAIRS;

  const mutation = useMutation({
    mutationFn: (input: BacktestInput) => api.runBacktest(input),
  });

  const lower = parseFloat(form.lower);
  const upper = parseFloat(form.upper);
  const grids = parseInt(form.grids, 10);
  const investment = parseFloat(form.investment);
  const leverage = parseFloat(form.leverage);
  const feePct = parseFloat(form.feePct);
  const limit = parseInt(form.limit, 10);

  const errors: string[] = [];
  if (!form.pair) errors.push('Pair required');
  if (!Number.isFinite(lower) || lower <= 0) errors.push('Lower price must be > 0');
  if (!Number.isFinite(upper) || upper <= 0) errors.push('Upper price must be > 0');
  if (Number.isFinite(lower) && Number.isFinite(upper) && lower >= upper) errors.push('Lower must be < upper');
  if (!Number.isInteger(grids) || grids < 2) errors.push('Grids must be >= 2');
  if (!Number.isFinite(investment) || investment <= 0) errors.push('Investment must be > 0');
  if (!Number.isFinite(leverage) || leverage < 1) errors.push('Leverage must be >= 1');
  if (!Number.isFinite(feePct) || feePct < 0 || feePct > 1) errors.push('Fee must be in [0, 1]');
  const isValid = errors.length === 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function run() {
    if (!isValid) return;
    mutation.mutate({
      pair: form.pair,
      direction: form.direction,
      leverage,
      lower_price: lower,
      upper_price: upper,
      num_grids: grids,
      investment_usdt: investment,
      fee_pct: feePct,
      interval: form.interval,
      limit,
    });
  }

  function applyToWizard() {
    // Hand the validated params to OverviewPage via router state. It
    // reads `presetWizard` and opens the create-bot-wizard pre-filled.
    navigate('/', {
      state: {
        presetWizard: {
          pair: form.pair,
          direction: form.direction,
          leverage,
          lower_price: lower,
          upper_price: upper,
          num_grids: grids,
          investment_usdt: investment,
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
        <p className="text-sm text-text-muted mt-1">
          Simulate a grid bot on historical candles. No orders placed,
          no funds at risk. Fees are deducted per round trip.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Form ───────────────────────────────────────────────── */}
        <Card className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Parameters
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Pair
            </label>
            <select
              value={form.pair}
              onChange={(e) => update('pair', e.target.value)}
              className="h-10 px-3 rounded-md bg-bg-surface border border-border-subtle text-sm text-text-primary"
            >
              {pairs.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                Direction
              </label>
              <select
                value={form.direction}
                onChange={(e) => update('direction', e.target.value as 'long' | 'short')}
                className="h-10 px-3 rounded-md bg-bg-surface border border-border-subtle text-sm text-text-primary"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <Input
              label="Leverage"
              numeric
              value={form.leverage}
              onChange={(e) => update('leverage', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lower price"
              numeric
              placeholder="e.g. 1800"
              value={form.lower}
              onChange={(e) => update('lower', e.target.value)}
            />
            <Input
              label="Upper price"
              numeric
              placeholder="e.g. 2400"
              value={form.upper}
              onChange={(e) => update('upper', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Grids"
              numeric
              value={form.grids}
              onChange={(e) => update('grids', e.target.value)}
            />
            <Input
              label="Investment (USDT)"
              numeric
              value={form.investment}
              onChange={(e) => update('investment', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fee % per side"
              numeric
              value={form.feePct}
              onChange={(e) => update('feePct', e.target.value)}
              helper="GRVT maker = 0.05"
            />
            <Input
              label="Candles"
              numeric
              value={form.limit}
              onChange={(e) => update('limit', e.target.value)}
              helper="Max 1000"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Interval
            </label>
            <select
              value={form.interval}
              onChange={(e) => update('interval', e.target.value as CandleInterval)}
              className="h-10 px-3 rounded-md bg-bg-surface border border-border-subtle text-sm text-text-primary"
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          {!isValid && (
            <ul className="text-2xs text-danger flex flex-col gap-0.5">
              {errors.map((e) => (
                <li key={e}>· {e}</li>
              ))}
            </ul>
          )}

          <Button
            onClick={run}
            disabled={!isValid || mutation.isPending}
          >
            <Play className="size-4" />
            {mutation.isPending ? 'Running...' : 'Run backtest'}
          </Button>
        </Card>

        {/* ── Result ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {mutation.isError && (
            <Card className="border-danger/40">
              <p className="text-sm text-danger">
                Backtest failed: {(mutation.error as Error).message}
              </p>
            </Card>
          )}

          {!mutation.data && !mutation.isPending && !mutation.isError && (
            <Card>
              <p className="text-sm text-text-muted">
                Configure parameters and run a backtest. Results appear here.
              </p>
            </Card>
          )}

          {mutation.isPending && (
            <Card>
              <p className="text-sm text-text-muted animate-pulse">
                Fetching candles and simulating...
              </p>
            </Card>
          )}

          {mutation.data && <ResultPanel result={mutation.data} onApply={applyToWizard} />}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onApply,
}: {
  result: BacktestResult;
  onApply: () => void;
}) {
  const points: EquityPoint[] = result.equityCurve.map((p) => ({
    date: new Date(p.time * 1000).toISOString().slice(0, 16).replace('T', ' '),
    equity: p.equity,
  }));

  const warnings: string[] = [];
  if (result.maxDrawdownPct > 30) warnings.push(`High drawdown — ${result.maxDrawdownPct.toFixed(1)}% peak-to-trough.`);
  if (result.roundTrips < 5) warnings.push(`Few round trips (${result.roundTrips}) — range may be too wide or grids too few.`);
  if (result.netProfit <= 0) warnings.push('Net profit ≤ 0 after fees. Tighten range or increase grids.');

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border-subtle rounded-lg overflow-hidden">
        <StatCard
          label="Net profit"
          value={
            <span className={result.netProfit >= 0 ? 'text-success' : 'text-danger'}>
              {formatPnl(result.netProfit)}
            </span>
          }
        />
        <StatCard label="Gross profit" value={formatPnl(result.totalProfit)} />
        <StatCard label="Fees paid" value={formatPnl(-result.totalFees)} />
        <StatCard
          label="Max drawdown"
          value={
            <span className={result.maxDrawdownPct > 30 ? 'text-danger' : 'text-text-primary'}>
              {formatPercent(-result.maxDrawdownPct)}
            </span>
          }
        />
        <StatCard label="Round trips" value={String(result.roundTrips)} />
        <StatCard
          label="Avg / trip"
          value={formatPnl(result.avgProfitPerTrip)}
        />
        <StatCard
          label="Profit factor"
          value={Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : '∞'}
        />
        <StatCard label="Days in market" value={`${result.daysInMarket}d`} />
        <StatCard label="Candles" value={String(result.candlesProcessed)} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Equity curve
          </h2>
          <span className="text-2xs text-text-muted">
            Starts at {formatUsdCompact(points[0]?.equity)}
          </span>
        </div>
        <EquityCurve points={points} height={260} />
      </Card>

      {warnings.length > 0 && (
        <Card className="border-warning/40">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <ul className="text-xs text-text-secondary flex flex-col gap-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onApply}>
          Apply to wizard
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </>
  );
}
