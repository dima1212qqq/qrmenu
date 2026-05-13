import { formatDistanceToNow } from '@/lib/utils';

interface WaiterCall {
  id: string;
  menuId: string;
  tableNumber: string | null;
  createdAt: string;
  status: 'pending' | 'completed';
}

interface CallsListProps {
  calls: WaiterCall[];
  onAccept: (id: string) => void;
}

export function CallsList({ calls, onAccept }: CallsListProps) {
  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <div
          key={call.id}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Стол {call.tableNumber || 'не указан'}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(call.createdAt))}
                </p>
              </div>
            </div>
            <button
              onClick={() => onAccept(call.id)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Принять
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}