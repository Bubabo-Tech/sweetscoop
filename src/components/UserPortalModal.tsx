import { useEffect, useState, type FormEvent } from 'react';
import { ClipboardList, Loader2, LogOut, User, X } from 'lucide-react';
import { formatRupiah } from '../data/defaultProducts';
import {
  formatFirebaseError,
  listenToUserOrders,
  saveUserProfile,
} from '../firebase';
import type { Order, OrderStatus, UserProfile } from '../types';

interface UserPortalModalProps {
  open: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onLogout: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  Baru: 'text-blue-700',
  Diproses: 'text-amber-700',
  Selesai: 'text-emerald-700',
  Dibatalkan: 'text-rose-700',
};

export function UserPortalModal({
  open,
  user,
  onClose,
  onLogout,
  onNotify,
}: UserPortalModalProps) {
  const [tab, setTab] = useState<'orders' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setAddress(user.address || '');
  }, [open, user]);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingOrders(true);
    setOrdersError('');
    const unsub = listenToUserOrders(
      user.uid,
      user.email,
      (list) => {
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        setOrdersError(formatFirebaseError(err));
        setLoadingOrders(false);
      }
    );
    return () => unsub();
  }, [open, user]);

  if (!open || !user) return null;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveUserProfile(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      onNotify('success', 'Profil pelanggan berhasil diperbarui.');
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f2948]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Portal Akun Pelanggan"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-[#dceafa] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#e6effa] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#2563eb] truncate">
              {user.email} · {user.role === 'admin' ? 'Admin Toko' : 'Pelanggan'}
            </p>
            <h2 className="text-lg font-extrabold text-[#173b67] truncate">
              Halo, {user.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup portal akun"
              className="w-9 h-9 rounded-xl text-[#58718e] hover:text-[#173b67] hover:bg-[#f0f7ff] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pt-3 border-b border-[#e6effa] flex gap-6">
          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'orders'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#607894] hover:text-[#173b67]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Pesanan Saya ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'profile'
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#607894] hover:text-[#173b67]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Alamat</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'orders' ? (
            loadingOrders ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-[#607894]">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
                <span>Memuat riwayat pesanan real-time...</span>
              </div>
            ) : ordersError ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
                {ordersError}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-bold text-[#173b67]">Belum ada pesanan</p>
                <p className="text-xs text-[#607894]">
                  Pesanan yang Anda buat saat masuk akun akan tampil secara real-time di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-[#dceafa] bg-[#f8fbff] p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-[#58718e]">
                        <span className="font-mono font-bold text-[#173b67] tabular-nums">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {new Date(order.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${STATUS_STYLE[order.status]}`}>
                        Status: {order.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#385675]">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span>
                            {item.name} × {item.qty}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatRupiah(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#e2eefb] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#58718e] truncate max-w-sm">
                        Alamat: {order.address || '-'}
                      </span>
                      <span className="font-mono font-extrabold text-[#173b67] tabular-nums">
                        Total {formatRupiah(order.total)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#385675] mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#385675] mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#385675] mb-1">
                  Alamat Pengiriman Default
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap untuk pengiriman gelato..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan Perubahan Profil</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
