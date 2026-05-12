// D.7 — StateStore tests.
// Real filesystem with a per-test temp dir under os.tmpdir(). The store
// performs atomic writes via tmp + rename so this exercises the real
// path. No fs mocking — fs is fast enough that a few KB writes per
// test cost ~ms.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StateStore, type AlertHistoryEntry } from '../src/state';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notifier-state-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('StateStore (D.7)', () => {
  it('returns defaults when no cursor.json exists yet', () => {
    const s = new StateStore(dir);
    const state = s.get();
    expect(state.lastRoundtripId).toBe(0);
    expect(state.equityHwm).toBe(0);
    expect(state.lastBotStatus).toEqual({});
    expect(state.lastSummaryDate).toBeNull();
    expect(state.lastErrorHash).toBeNull();
  });

  it('persists updates atomically (tmp + rename) and round-trips them', () => {
    const s = new StateStore(dir);
    s.update({ lastRoundtripId: 42, equityHwm: 1234.56 });

    // Read with a second instance to confirm the JSON on disk parses.
    const s2 = new StateStore(dir);
    expect(s2.get().lastRoundtripId).toBe(42);
    expect(s2.get().equityHwm).toBe(1234.56);
  });

  it('does not leave the .tmp scratch file behind after a successful write', () => {
    const s = new StateStore(dir);
    s.update({ lastRoundtripId: 7 });
    const files = fs.readdirSync(dir);
    expect(files).toContain('cursor.json');
    expect(files.find((f) => f.endsWith('.tmp'))).toBeUndefined();
  });

  it('merges partial updates onto existing state without clobbering other fields', () => {
    const s = new StateStore(dir);
    s.update({ lastRoundtripId: 5, equityHwm: 1000 });
    s.update({ lastRoundtripId: 10 }); // only id should change
    expect(s.get().lastRoundtripId).toBe(10);
    expect(s.get().equityHwm).toBe(1000);
  });

  it('falls back to defaults on corrupt JSON instead of throwing', () => {
    fs.writeFileSync(path.join(dir, 'cursor.json'), '{not valid json');
    const s = new StateStore(dir);
    expect(s.get().lastRoundtripId).toBe(0);
  });

  it('appendAlert + getAlertHistory round-trip a single entry', () => {
    const s = new StateStore(dir);
    const entry: AlertHistoryEntry = {
      ts: 1715164800000,
      type: 'fill',
      botId: 48,
      pair: 'SOL_USDT_Perp',
      message: 'Test alert',
    };
    s.appendAlert(entry);
    const history = s.getAlertHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(entry);
  });

  it('caps alert history at 500 entries, pruning oldest', () => {
    const s = new StateStore(dir);
    for (let i = 0; i < 550; i++) {
      s.appendAlert({ ts: i, type: 'fill', message: `entry ${i}` });
    }
    const history = s.getAlertHistory();
    expect(history).toHaveLength(500);
    // Oldest 50 (ts 0..49) should be gone; ts 50 should be the first
    // remaining entry.
    expect(history[0]?.ts).toBe(50);
    expect(history[history.length - 1]?.ts).toBe(549);
  });

  it('getAlertHistory returns empty array when history file missing', () => {
    const s = new StateStore(dir);
    expect(s.getAlertHistory()).toEqual([]);
  });
});
