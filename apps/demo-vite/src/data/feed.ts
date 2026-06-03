import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

// A deterministic mock "live feed": values wobble as a function of a tick that
// advances on each refetch, so the demo animates without randomness (stable for
// screenshots and tests).
const wobble = (base: number, amplitude: number, tick: number, phase: number): number =>
  base + amplitude * Math.sin((tick + phase) * 0.6);

type PriceRow = { price: string; size: string };
type Position = { display: string; pnl: number; symbol: string };
type Trade = { display: string; price: string; size: string };

const fmt = (value: number, decimals = 1): string =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

const buildBook = (tick: number): { asks: Array<PriceRow>; bids: Array<PriceRow> } => {
  const mid = wobble(64_210, 6, tick, 0);
  const row = (offset: number, phase: number): PriceRow => ({
    price: fmt(mid + offset, 1),
    size: fmt(wobble(1, 0.8, tick, phase), 2),
  });
  return {
    asks: [row(8.5, 3), row(5, 2), row(2.5, 1)],
    bids: [row(-2.5, 4), row(-5, 5), row(-8.5, 6)],
  };
};

const buildTrades = (tick: number): Array<Trade> =>
  [0, 1, 2, 3].map((index) => ({
    display: fmt(wobble(64_209, 5, tick, index), 1),
    price: fmt(wobble(64_209, 5, tick, index), 1),
    size: fmt(wobble(0.6, 0.4, tick, index + 1), 2),
  }));

const buildPositions = (tick: number): Array<Position> =>
  [
    { base: 2.4, symbol: "BTC-PERP" },
    { base: -0.8, symbol: "ETH-PERP" },
    { base: 1.1, symbol: "SOL-PERP" },
  ].map(({ base, symbol }, index) => {
    const pnl = wobble(base, 0.6, tick, index);
    return { display: `${pnl >= 0 ? "+" : ""}${fmt(pnl, 1)}%`, pnl, symbol };
  });

const buildChart = (tick: number): Array<number> =>
  Array.from(
    { length: 48 },
    (_, index) => 50 + 16 * Math.sin(index * 0.28 + tick * 0.25) + 7 * Math.sin(index * 0.13 + 1),
  );

const usePolledData = <T>(key: string, build: (tick: number) => T, intervalMs: number): T => {
  const tick = useRef(0);
  const { data } = useQuery({
    initialData: () => build(0),
    queryFn: () => {
      tick.current += 1;
      return build(tick.current);
    },
    queryKey: [key],
    refetchInterval: intervalMs,
  });
  // initialData guarantees data; the fallback only satisfies the generic narrowing.
  return data ?? build(0);
};

const useOrderBook = () => usePolledData("orderbook", buildBook, 1500);
const useTrades = () => usePolledData("trades", buildTrades, 1200);
const usePositions = () => usePolledData("positions", buildPositions, 2000);
const useChartSeries = () => usePolledData("chart", buildChart, 1800);

export { useChartSeries, useOrderBook, usePositions, useTrades };
export type { Position, PriceRow, Trade };
