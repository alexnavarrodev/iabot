// GRVT environment configuration.
//
// Selects the GRVT base URLs (edge auth, trading REST, market-data REST)
// depending on GRVT_ENV. Defaults to mainnet to preserve prior behaviour.
//
//   GRVT_ENV=testnet  -> *.testnet.grvt.io   (paper / test funds)
//   GRVT_ENV=mainnet  -> *.grvt.io           (real funds)
//
// Centralising these here means the rest of the codebase never hardcodes a
// host again — point everything at the helpers below.

import dotenv from 'dotenv';

dotenv.config();

export type GrvtEnv = 'mainnet' | 'testnet';

export function getGrvtEnv(): GrvtEnv {
  const raw = (process.env.GRVT_ENV || 'mainnet').trim().toLowerCase();
  if (raw === 'testnet' || raw === 'test') return 'testnet';
  return 'mainnet';
}

// Insert ".testnet" into the host for testnet, e.g.
//   edge.grvt.io -> edge.testnet.grvt.io
function host(sub: string): string {
  return getGrvtEnv() === 'testnet' ? `${sub}.testnet.grvt.io` : `${sub}.grvt.io`;
}

/** Edge auth base, e.g. https://edge.grvt.io */
export function edgeBaseUrl(): string {
  return `https://${host('edge')}`;
}

/** Trading REST base including the /full/v1 suffix. */
export function tradingBaseUrl(): string {
  return process.env.GRVT_TRADING_URL || `https://${host('trades')}/full/v1`;
}

/** Market-data REST base including the /full/v1 suffix. */
export function marketDataBaseUrl(): string {
  return process.env.GRVT_MARKET_DATA_URL || `https://${host('market-data')}/full/v1`;
}
