import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Check, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

export default function NotificationsPanel({ notifications, onChanged }) {
  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    onChanged?.();
  };
  const del = async (id) => {
    await api.delete(`/notifications/${id}`);
    onChanged?.();
  };
  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    onChanged?.();
  };
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Notifications</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">{unread} non lue(s)</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={markAllRead} className="text-[11px] text-teal-600 font-medium hover:text-teal-800 transition">
            Tout marquer lu
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl py-16 text-center">
          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-[12px] text-slate-400">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const date = n.createdAt ? format(new Date(n.createdAt), "d MMM 'à' HH:mm", { locale: fr }) : '';
            return (
              <div key={n.id} className={`bg-white border rounded-xl p-4 flex gap-3 transition ${!n.read ? 'border-blue-100 bg-blue-50/20' : 'border-slate-100'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-slate-200' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[12.5px] font-medium ${n.read ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10.5px] text-slate-400 mt-1">{date}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => del(n.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
