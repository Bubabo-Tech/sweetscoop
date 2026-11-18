import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, Loader2, X } from 'lucide-react';
import { buildWhatsAppUrl, formatRupiah, STORE_NAME } from '../data/defaultProducts';
import { createOrder, formatFirebaseError, saveUserProfile } from '../firebase';
import type { CartItem, UserProfile } from '../types';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  user: UserProfile | null;
  onClose: () => void;
  onOrderCreated: () => void;
  onOpenAuth: () => void;
}

export function CheckoutModal({
  open,
  items,
  user,
  onClose,
  onOrderCreated,
  onOpenAuth,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    waUrl: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmedOrder(null);
    setCustomerName(user?.name || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
    setNote('');
  }, [open, user]);

  if (!open) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!items.length) return;
    setError('');
    setLoading(true);

    const orderItems = items.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    const summaryLines = orderItems
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name} × ${item.qty} — ${formatRupiah(item.price * item.qty)}`
      )
      .join('\n');

    let orderId = '';
    try {
      orderId = await createOrder({
        userId: user?.uid || null,
        userEmail: user?.email || '',
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
        items: orderItems,
        total,
      });

      if (user?.uid) {
        saveUserProfile(user.uid, {
          name: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }).catch(() => {});
      }

      const waMessage = [
        `Halo ${STORE_NAME}! Saya telah membuat pesanan dari website:`,
        orderId ? `ID Pesanan: #${orderId.slice(-6).toUpperCase()}` : '',
        '',
        summaryLines,
        '',
        `Total: ${formatRupiah(total)}`,
        `Nama: ${customerName.trim()}`,
        `No. WhatsApp: ${phone.trim()}`,
        `Alamat: ${address.trim()}`,
        note.trim() ? `Catatan: ${note.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      setConfirmedOrder({
        orderId,
        waUrl: buildWhatsAppUrl(waMessage),
        total,
      });
      onOrderCreated();
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f2948]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#dceafa] shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-[#e6effa] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#2563eb]">Checkout Sweet Scoop</p>
            <h2 id="checkout-modal-title" className="text-lg font-extrabold text-[#173b67]">
              {confirmedOrder ? 'Pesanan Berhasil Dicatat' : 'Detail Pengiriman Pesanan'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup checkout"
            className="w-9 h-9 rounded-xl text-[#58718e] hover:text-[#173b67] hover:bg-[#f0f7ff] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-extrabold text-[#173b67]">
                Pesanan #{confirmedOrder.orderId.slice(-6).toUpperCase()} Tersimpan
              </p>
              <p className="text-xs text-[#58718e]">
                Data pesanan sudah masuk ke Realtime Database admin toko. Total tagihan{' '}
                <strong className="font-mono text-[#173b67] tabular-nums">
                  {formatRupiah(confirmedOrder.total)}
                </strong>
                .
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <a
                href={confirmedOrder.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Kirim Konfirmasi ke WhatsApp Toko</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#f0f7ff] hover:bg-[#e2f0ff] text-[#173b67] text-xs font-semibold transition-colors"
              >
                Kembali ke Toko
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {!user && (
              <div className="rounded-xl bg-[#f3f8ff] border border-[#d6e7fb] px-3.5 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-[#385675]">
                  Masuk akun agar riwayat dan status pesanan tersimpan otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="text-xs font-bold text-[#2563eb] hover:underline whitespace-nowrap shrink-0"
                >
                  Masuk / Daftar
                </button>
              </div>
            )}

            <div className="rounded-xl bg-[#f7fbff] border border-[#e2eefb] p-3.5 space-y-1.5 max-h-36 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between text-xs text-[#173b67]"
                >
                  <span className="truncate pr-2">
                    {item.name} × {item.qty}
                  </span>
                  <span className="font-mono font-semibold tabular-nums shrink-0">
                    {formatRupiah(item.price * item.qty)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#e2eefb] flex items-center justify-between text-xs font-extrabold text-[#173b67]">
                <span>Total</span>
                <span className="font-mono text-sm text-[#2563eb] tabular-nums">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#385675] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama penerima"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#385675] mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#385675] mb-1">
                Alamat Pengiriman
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat lengkap pengiriman..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#385675] mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Tambah sendok / antar jam 4 sore"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !items.length}
              className="w-full py-3.5 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Pesanan & Buat Konfirmasi</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
