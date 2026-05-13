'use client';

interface TabsProps {
  active: 'calls' | 'orders';
  onChange: (tab: 'calls' | 'orders') => void;
}

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      <button
        onClick={() => onChange('calls')}
        className={`flex-1 py-3 text-center font-medium transition-colors ${
          active === 'calls'
            ? 'text-orange-600 border-b-2 border-orange-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🔔 Вызовы
      </button>
      <button
        onClick={() => onChange('orders')}
        className={`flex-1 py-3 text-center font-medium transition-colors ${
          active === 'orders'
            ? 'text-orange-600 border-b-2 border-orange-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        📦 Заказы
      </button>
    </div>
  );
}