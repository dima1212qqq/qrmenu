import { formatDistanceToNow } from '@/lib/utils';

interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  menuId: string;
  organizationId: string;
  tableNumber: string | null;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

interface OrdersListProps {
  orders: Order[];
  onComplete: (id: string) => void;
}

export function OrdersList({ orders, onComplete }: OrdersListProps) {
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Стол {order.tableNumber || 'не указан'}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(order.createdAt))}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              {order.total}₽
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.quantity}× {item.dishName}
                </span>
                <span className="text-gray-500">
                  {item.price * item.quantity}₽
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onComplete(order.id)}
            className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            Выполнено
          </button>
        </div>
      ))}
    </div>
  );
}