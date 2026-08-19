import type { ReactNode } from "react";

const ORDERS = [
  { id: "#A-1042", status: "Filled", value: "$1,280" },
  { id: "#A-1041", status: "Pending", value: "$640" },
  { id: "#A-1040", status: "Filled", value: "$2,115" },
  { id: "#A-1039", status: "Filled", value: "$905" },
] as const;

const TablePanel = (): ReactNode => (
  <table className="w-full border-collapse text-xs">
    <caption className="sr-only">Recent orders</caption>
    <thead>
      <tr className="text-muted-foreground text-left">
        <th className="pb-2 font-medium">Order</th>
        <th className="pb-2 font-medium">Status</th>
        <th className="pb-2 text-right font-medium">Value</th>
      </tr>
    </thead>
    <tbody className="text-foreground">
      {ORDERS.map((o) => (
        <tr className="border-border border-t" key={o.id}>
          <td className="py-1.5 font-mono">{o.id}</td>
          <td className="py-1.5">{o.status}</td>
          <td className="py-1.5 text-right tabular-nums">{o.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export { TablePanel };
