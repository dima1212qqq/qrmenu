interface StatsBarProps {
  callsCount: number;
  ordersCount: number;
}

export function StatsBar({ callsCount, ordersCount }: StatsBarProps) {
  return (
    <div className="flex gap-6 p-4 bg-orange-50">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔔</span>
        <span className="font-bold text-xl text-orange-600">{callsCount}</span>
        <span className="text-gray-600">вызовов</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📦</span>
        <span className="font-bold text-xl text-orange-600">{ordersCount}</span>
        <span className="text-gray-600">заказов</span>
      </div>
    </div>
  );
}
