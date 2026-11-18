import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatRupiah } from '../data/defaultProducts';
import type { CartItem } from '../types';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onProceedCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0f2948]/60 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja"
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl border-l border-[#dceafa]">
        <div className="px-6 py-5 border-b border-[#e6effa] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#2563eb]" />
            <h3 className="text-lg font-extrabold text-[#173b67]">Keranjang Belanja</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang"
            className="w-9 h-9 rounded-xl text-[#58718e] hover:text-[#173b67] hover:bg-[#f0f7ff] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f7ff] text-[#2563eb] flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#173b67]">Keranjang masih kosong</p>
              <p className="text-xs text-[#607894] mt-1 max-w-[220px]">
                Pilih es krim atau gelato favorit Anda dari katalog untuk mulai memesan.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#f7fbff] border border-[#dceafa]"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-[#e6effa]">
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#173b67] truncate">{item.name}</h4>
                  <p className="text-xs font-mono font-semibold text-[#2563eb] tabular-nums mt-0.5">
                    {formatRupiah(item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, -1)}
                      aria-label={`Kurangi jumlah ${item.name}`}
                      className="w-7 h-7 rounded-lg bg-white border border-[#d6e5f5] text-[#173b67] hover:bg-[#eef6ff] flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-[#173b67] w-6 text-center tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, 1)}
                      aria-label={`Tambah jumlah ${item.name}`}
                      className="w-7 h-7 rounded-lg bg-white border border-[#d6e5f5] text-[#173b67] hover:bg-[#eef6ff] flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.productId)}
                  aria-label={`Hapus ${item.name}`}
                  className="p-2 text-[#7c94ae] hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-[#e6effa] bg-[#f8fbff] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#58718e]">Total Belanja</span>
            <span className="text-lg font-mono font-extrabold text-[#173b67] tabular-nums">
              {formatRupiah(subtotal)}
            </span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onProceedCheckout}
            className="w-full py-3.5 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-colors"
          >
            Lanjut ke Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
