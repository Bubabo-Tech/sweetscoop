import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  Database,
  ExternalLink,
  IceCreamCone,
  ImagePlus,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  buildWhatsAppUrl,
  formatRupiah,
} from '../data/defaultProducts';
import {
  addProduct,
  ASIA_RTDB_URL,
  DEFAULT_RTDB_URL,
  deleteOrder,
  deleteProduct,
  detectWorkingRtdbUrl,
  EUROPE_RTDB_URL,
  formatFirebaseError,
  getRtdbUrl,
  listenToAllOrders,
  listenToAllUsers,
  listenToMessages,
  listenToRtdbConnection,
  mergeCatalogProducts,
  seedDefaultProducts,
  setRtdbUrl,
  updateOrderStatus,
  updateProduct,
} from '../firebase';
import type {
  ContactMessage,
  Order,
  OrderStatus,
  Product,
  UserProfile,
} from '../types';
import { compressImageFile } from '../utils/imageUpload';
import { ProductImage } from './ProductImage';

interface AdminDashboardProps {
  adminUser: UserProfile;
  rtdbProducts: Product[];
  onBackToStore: () => void;
  onLogout: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

type AdminSection = 'orders' | 'products' | 'users' | 'settings';

const RECOMMENDED_RULES = `{
  "rules": {
    "products": {
      ".read": true,
      ".write": "auth != null && auth.token.email == '${ADMIN_EMAIL}'"
    },
    "orders": {
      ".indexOn": ["userId"],
      ".read": "auth != null",
      ".write": true
    },
    "users": {
      ".read": "auth != null && auth.token.email == '${ADMIN_EMAIL}'",
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && (auth.uid == $uid || auth.token.email == '${ADMIN_EMAIL}')"
      }
    },
    "messages": {
      ".read": "auth != null && auth.token.email == '${ADMIN_EMAIL}'",
      ".write": true
    }
  }
}`;

const STATUS_TEXT_CLASS: Record<OrderStatus, string> = {
  Baru: 'text-blue-700',
  Diproses: 'text-amber-700',
  Selesai: 'text-emerald-700',
  Dibatalkan: 'text-rose-700',
};

export function AdminDashboard({
  adminUser,
  rtdbProducts,
  onBackToStore,
  onLogout,
  onNotify,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>('orders');
  const [rtdbConnected, setRtdbConnected] = useState<boolean>(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [dataError, setDataError] = useState('');

  const [orderFilter, setOrderFilter] = useState<'Semua' | OrderStatus>('Semua');
  const [orderSearch, setOrderSearch] = useState('');
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  // Product form state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState<'Gelato' | 'Ice Cream' | 'Lainnya'>('Gelato');
  const [prodImage, setProdImage] = useState('');
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [prodDesc, setProdDesc] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // User search
  const [userSearch, setUserSearch] = useState('');

  // RTDB URL setting & auto-detect
  const [rtdbUrlInput, setRtdbUrlInput] = useState(getRtdbUrl());
  const [detectingRtdb, setDetectingRtdb] = useState(false);
  const [detectedAltUrl, setDetectedAltUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      listenToRtdbConnection(setRtdbConnected),
      listenToAllOrders(setOrders, (err) => setDataError(formatFirebaseError(err))),
      listenToAllUsers(setUsers, (err) => setDataError(formatFirebaseError(err))),
      listenToMessages(setMessages, (err) => setDataError(formatFirebaseError(err))),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (rtdbConnected) {
      setDetectedAltUrl(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await detectWorkingRtdbUrl();
      if (found && found !== getRtdbUrl()) {
        setDetectedAltUrl(found);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [rtdbConnected]);

  const activeProducts = useMemo(
    () => mergeCatalogProducts(rtdbProducts),
    [rtdbProducts]
  );

  const kpis = useMemo(() => {
    const newOrders = orders.filter((o) => o.status === 'Baru').length;
    const completedRevenue = orders
      .filter((o) => o.status === 'Selesai')
      .reduce((sum, o) => sum + o.total, 0);
    return {
      totalOrders: orders.length,
      newOrders,
      completedRevenue,
      totalProducts: activeProducts.length,
      totalUsers: users.length,
    };
  }, [orders, activeProducts, users]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderFilter !== 'Semua' && o.status !== orderFilter) return false;
      if (!q) return true;
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q)
      );
    });
  }, [orders, orderFilter, orderSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPrice('');
    setProdCategory('Gelato');
    setProdImage('');
    setPhotoSizeKb(null);
    setProdDesc('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingPhoto(true);
    try {
      const compressed = await compressImageFile(file);
      setProdImage(compressed.dataUrl);
      setPhotoSizeKb(compressed.sizeKb);
      onNotify('success', `Foto produk siap diupload (${compressed.sizeKb} KB).`);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(prodPrice);
    if (!prodName.trim() || !numericPrice || numericPrice <= 0) {
      onNotify('error', 'Nama produk dan harga valid wajib diisi.');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        name: prodName.trim(),
        price: numericPrice,
        category: prodCategory,
        image: prodImage.trim(),
        description: prodDesc.trim() || 'Gelato dan es krim lezat dengan kualitas terbaik.',
      };
      if (editingProductId && !editingProductId.startsWith('default-')) {
        await updateProduct(editingProductId, payload);
        onNotify('success', `Produk "${payload.name}" diperbarui di Realtime Database.`);
      } else {
        await addProduct(payload);
        onNotify('success', `Produk "${payload.name}" dan fotonya berhasil disimpan ke Realtime Database.`);
      }
      resetProductForm();
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSeedProducts = async () => {
    setSeeding(true);
    try {
      const count = await seedDefaultProducts();
      if (count > 0) {
        onNotify('success', `${count} menu bawaan berhasil disinkronkan ke Realtime Database.`);
      } else {
        onNotify('info', 'Semua menu bawaan sudah ada di Realtime Database.');
      }
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    } finally {
      setSeeding(false);
    }
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      onNotify('success', `Status pesanan diperbarui ke "${status}".`);
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      setConfirmDeleteOrderId(null);
      onNotify('success', 'Pesanan dihapus dari database.');
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setDeletingProductId(product.id);
    try {
      await deleteProduct(product.id, product.name);
      setConfirmDeleteProductId(null);
      if (editingProductId === product.id) resetProductForm();
      onNotify('success', `Produk "${product.name}" berhasil dihapus.`);
    } catch (err) {
      onNotify('error', formatFirebaseError(err));
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleSaveRtdbUrl = (e: FormEvent) => {
    e.preventDefault();
    if (!rtdbUrlInput.trim().startsWith('https://')) {
      onNotify('error', 'URL Realtime Database harus diawali dengan https://');
      return;
    }
    setRtdbUrl(rtdbUrlInput.trim());
    onNotify('success', 'URL database disimpan. Memuat ulang koneksi Firebase...');
    setTimeout(() => window.location.reload(), 600);
  };

  const handleDetectRtdb = async () => {
    setDetectingRtdb(true);
    try {
      const found = await detectWorkingRtdbUrl();
      if (found) {
        setRtdbUrlInput(found);
        setRtdbUrl(found);
        onNotify('success', `Server RTDB ditemukan (${found}). Menghubungkan ulang...`);
        setTimeout(() => window.location.reload(), 600);
      } else {
        onNotify(
          'error',
          'Server Realtime Database belum ditemukan. Pastikan Realtime Database sudah dibuat di Firebase Console → Build → Realtime Database.'
        );
      }
    } finally {
      setDetectingRtdb(false);
    }
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(RECOMMENDED_RULES);
      onNotify('success', 'Rules Firebase Realtime Database disalin ke clipboard.');
    } catch {
      onNotify('error', 'Gagal menyalin otomatis. Silakan salin manual dari kotak rules.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8fd] text-[#173b67] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#14345b] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#214a7a]">
        <div>
          <div className="p-5 border-b border-white/10">
            <p className="text-[11px] font-semibold text-blue-300">Sweet Scoop Admin</p>
            <h1 className="text-lg font-extrabold tracking-tight mt-0.5">Dashboard Toko</h1>
            <p className="text-[11px] text-blue-200/80 truncate mt-1">{adminUser.email}</p>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSection('orders')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                section === 'orders'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Pesanan ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSection('products')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                section === 'products'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <IceCreamCone className="w-4 h-4 shrink-0" />
              <span>Kelola Produk ({activeProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSection('users')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                section === 'users'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Pengguna ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSection('settings')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 whitespace-nowrap transition-colors ${
                section === 'settings'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Pesan & Firebase ({messages.length})</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 flex lg:flex-col gap-2">
          <button
            type="button"
            onClick={onBackToStore}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lihat Toko</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-[#dceafa] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#607894]">
              Sweet Scoop /{' '}
              <span className="font-semibold text-[#173b67]">
                {section === 'orders'
                  ? 'Daftar Pesanan'
                  : section === 'products'
                  ? 'Kelola Produk'
                  : section === 'users'
                  ? 'Akun Terdaftar'
                  : 'Pesan & Konfigurasi RTDB'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={rtdbConnected ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {rtdbConnected
                ? 'Firebase RTDB: Terhubung'
                : 'Firebase RTDB: Menunggu Koneksi'}
            </span>
          </div>
        </header>

        <main className="p-6 max-w-6xl w-full mx-auto space-y-6">
          {detectedAltUrl && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">Server Realtime Database terdeteksi di wilayah lain</p>
                <p className="font-mono text-[11px] mt-0.5">{detectedAltUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRtdbUrl(detectedAltUrl);
                  window.location.reload();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Hubungkan Sekarang
              </button>
            </div>
          )}

          {dataError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 space-y-1">
              <p className="font-bold">Catatan Koneksi Realtime Database:</p>
              <p>{dataError}</p>
              <button
                type="button"
                onClick={() => setSection('settings')}
                className="font-bold underline text-rose-800"
              >
                Buka Pengaturan Firebase RTDB &amp; Rules
              </button>
            </div>
          )}

          {/* KPI Strip (clickable shortcuts to all Admin data) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              type="button"
              onClick={() => setSection('orders')}
              className="text-left bg-white rounded-xl border border-[#dceafa] hover:border-[#2563eb] p-4 transition-colors"
            >
              <p className="text-xs text-[#607894]">Total Pesanan</p>
              <p className="text-2xl font-extrabold text-[#173b67] font-mono tabular-nums mt-1">
                {kpis.totalOrders}
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setSection('orders');
                setOrderFilter('Baru');
              }}
              className="text-left bg-white rounded-xl border border-[#dceafa] hover:border-[#2563eb] p-4 transition-colors"
            >
              <p className="text-xs text-[#607894]">Pesanan Baru</p>
              <p className="text-2xl font-extrabold text-[#2563eb] font-mono tabular-nums mt-1">
                {kpis.newOrders}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSection('orders')}
              className="text-left bg-white rounded-xl border border-[#dceafa] hover:border-[#2563eb] p-4 transition-colors"
            >
              <p className="text-xs text-[#607894]">Omzet Selesai</p>
              <p className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums mt-1 truncate">
                {formatRupiah(kpis.completedRevenue)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSection('products')}
              className="text-left bg-white rounded-xl border border-[#dceafa] hover:border-[#2563eb] p-4 transition-colors"
            >
              <p className="text-xs text-[#607894]">Produk di RTDB</p>
              <p className="text-2xl font-extrabold text-[#173b67] font-mono tabular-nums mt-1">
                {kpis.totalProducts}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSection('users')}
              className="text-left bg-white rounded-xl border border-[#dceafa] hover:border-[#2563eb] p-4 transition-colors col-span-2 lg:col-span-1"
            >
              <p className="text-xs text-[#607894]">Akun &amp; Pesan</p>
              <p className="text-2xl font-extrabold text-[#173b67] font-mono tabular-nums mt-1">
                {kpis.totalUsers} · {messages.length}
              </p>
            </button>
          </div>

          {/* SECTION: ORDERS */}
          {section === 'orders' && (
            <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f0f7ff] rounded-xl">
                  {(['Semua', 'Baru', 'Diproses', 'Selesai', 'Dibatalkan'] as const).map(
                    (statusTab) => (
                      <button
                        key={statusTab}
                        type="button"
                        onClick={() => setOrderFilter(statusTab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          orderFilter === statusTab
                            ? 'bg-white text-[#173b67] shadow-sm'
                            : 'text-[#58718e] hover:text-[#173b67]'
                        }`}
                      >
                        {statusTab}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#7c94ae] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Cari nama, WA, ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-xs text-[#173b67] outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm font-bold text-[#173b67]">Belum ada pesanan</p>
                  <p className="text-xs text-[#607894]">
                    Pesanan pelanggan yang masuk dari website akan muncul secara real-time di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-[#dceafa] p-4 space-y-3 hover:border-[#b3d5fb] transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-[#173b67]">
                              {order.customerName}
                            </h3>
                            <span className="text-xs font-mono text-[#607894] tabular-nums">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span aria-hidden="true" className="text-[#9cb1c7]">·</span>
                            <span className={`text-xs font-bold ${STATUS_TEXT_CLASS[order.status]}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#58718e] mt-0.5 tabular-nums">
                            {order.phone}
                            {order.userEmail ? ` · ${order.userEmail}` : ''} ·{' '}
                            {new Date(order.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Ubah status pesanan ${order.customerName}`}
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatus(order.id, e.target.value as OrderStatus)
                            }
                            className="rounded-xl border border-[#d6e5f5] bg-[#f5f9ff] px-3 py-1.5 text-xs font-semibold text-[#173b67] outline-none focus:border-[#2563eb]"
                          >
                            <option value="Baru">Baru</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Dibatalkan">Dibatalkan</option>
                          </select>

                          {confirmDeleteOrderId === order.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(order.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteOrderId(null)}
                                className="px-2 py-1.5 rounded-lg bg-[#f0f7ff] text-[#58718e] text-[11px] font-semibold"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteOrderId(order.id)}
                              aria-label="Hapus pesanan"
                              className="p-2 rounded-lg text-[#7c94ae] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#f8fbff] px-3.5 py-2.5 space-y-1 text-xs text-[#385675]">
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

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="text-[#58718e] space-y-0.5">
                          <p>Alamat: {order.address || '-'}</p>
                          {order.note && <p>Catatan: {order.note}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-extrabold text-[#2563eb] tabular-nums">
                            Total: {formatRupiah(order.total)}
                          </span>
                          {order.phone && order.phone !== '-' && (
                            <a
                              href={buildWhatsAppUrl(
                                `Halo ${order.customerName}, status pesanan Sweet Scoop #${order.id
                                  .slice(-6)
                                  .toUpperCase()} saat ini: ${order.status}.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                            >
                              <span>Hubungi WA</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION: PRODUCTS */}
          {section === 'products' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#173b67]">
                      {editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}
                    </h2>
                    <p className="text-xs text-[#607894]">
                      Produk tersimpan langsung di Firebase Realtime Database dan tampil otomatis di katalog.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedProducts}
                    className="px-3.5 py-2 rounded-xl bg-[#f0f7ff] hover:bg-[#e1effe] border border-[#cde3fc] text-xs font-bold text-[#173b67] transition-colors flex items-center gap-2"
                  >
                    {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Sinkronkan 5 Menu Bawaan ke RTDB</span>
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="grid sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#385675] mb-1">
                      Nama Produk
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={70}
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Contoh: Mango Sorbet Gelato"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#385675] mb-1">
                        Harga (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        placeholder="30000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] font-mono outline-none focus:border-[#2563eb] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#385675] mb-1">
                        Kategori
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) =>
                          setProdCategory(e.target.value as 'Gelato' | 'Ice Cream' | 'Lainnya')
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                      >
                        <option value="Gelato">Gelato</option>
                        <option value="Ice Cream">Ice Cream</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2 space-y-3">
                    <label className="block text-xs font-semibold text-[#385675]">
                      Foto Produk (Upload Langsung dari Perangkat atau Tempel URL)
                    </label>

                    <div className="grid sm:grid-cols-[140px_1fr] gap-4 items-start">
                      <div className="w-36 h-36 rounded-2xl border border-[#d6e5f5] bg-[#f5f9ff] overflow-hidden relative shrink-0 flex items-center justify-center">
                        {prodImage ? (
                          <>
                            <ProductImage
                              src={prodImage}
                              alt={prodName || 'Preview produk'}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setProdImage('');
                                setPhotoSizeKb(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              aria-label="Hapus foto produk"
                              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-[#14345b]/80 hover:bg-[#14345b] text-white flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center px-3 text-[#7c94ae]">
                            <ImagePlus className="w-7 h-7 mx-auto mb-1" />
                            <span className="text-[11px] font-medium block">
                              Belum ada foto
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                          id="product-photo-upload"
                        />
                        <label
                          htmlFor="product-photo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#eef5ff] hover:bg-[#dfeeff] border border-[#c7dffb] text-xs font-bold text-[#173b67] cursor-pointer transition-colors"
                        >
                          {compressingPhoto ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
                          ) : (
                            <Upload className="w-4 h-4 text-[#2563eb]" />
                          )}
                          <span>
                            {compressingPhoto
                              ? 'Memproses foto...'
                              : prodImage
                              ? 'Ganti Foto dari Galeri / File'
                              : 'Pilih & Upload Foto Produk'}
                          </span>
                        </label>

                        {photoSizeKb !== null && (
                          <p className="text-[11px] font-semibold text-emerald-700">
                            Foto terkompresi otomatis ({photoSizeKb} KB) dan siap disimpan ke database.
                          </p>
                        )}

                        <div>
                          <input
                            type="text"
                            value={prodImage.startsWith('data:') ? '' : prodImage}
                            onChange={(e) => {
                              setProdImage(e.target.value);
                              setPhotoSizeKb(null);
                            }}
                            placeholder="Atau tempel URL foto (https://...)"
                            className="w-full px-3.5 py-2 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-xs text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#385675] mb-1">
                      Deskripsi Singkat
                    </label>
                    <textarea
                      rows={2}
                      maxLength={240}
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder="Ceritakan cita rasa dan tekstur produk..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={savingProduct || compressingPhoto}
                      className="px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      {savingProduct ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>
                        {editingProductId ? 'Simpan Perubahan Produk' : 'Simpan Produk ke Database'}
                      </span>
                    </button>
                    {editingProductId && (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="px-4 py-2.5 rounded-xl bg-[#f0f7ff] text-[#58718e] text-xs font-semibold"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-[#173b67]">
                      Semua Produk Toko ({activeProducts.length})
                    </h2>
                    <p className="text-xs text-[#607894]">
                      Anda dapat mengedit atau menghapus produk mana saja dari daftar ini.
                    </p>
                  </div>
                </div>

                {activeProducts.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-sm font-bold text-[#173b67]">Belum ada produk aktif</p>
                    <p className="text-xs text-[#607894]">
                      Upload produk baru pada formulir di atas atau pulihkan 5 menu bawaan.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeProducts.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-[#dceafa] p-3 flex gap-3 items-start"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#f5f9ff]">
                          <ProductImage
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#173b67] truncate">{p.name}</p>
                          <p className="text-xs text-[#607894]">
                            {p.category} ·{' '}
                            <span className="font-mono font-bold text-[#2563eb] tabular-nums">
                              {formatRupiah(p.price)}
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProductId(p.id);
                                setProdName(p.name);
                                setProdPrice(String(p.price));
                                setProdCategory(p.category);
                                setProdImage(p.image);
                                setPhotoSizeKb(null);
                                setProdDesc(p.description);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#f0f7ff] hover:bg-[#e1effe] text-xs font-semibold text-[#2563eb] flex items-center gap-1 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            {confirmDeleteProductId === p.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={deletingProductId === p.id}
                                  onClick={() => handleDeleteProduct(p)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1"
                                >
                                  {deletingProductId === p.id && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  <span>Ya, Hapus</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingProductId === p.id}
                                  onClick={() => setConfirmDeleteProductId(null)}
                                  className="px-2 py-1 rounded-lg bg-[#f0f7ff] text-xs text-[#607894] font-semibold"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteProductId(p.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SECTION: USERS */}
          {section === 'users' && (
            <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#173b67]">
                    Akun Pengguna & Admin Terdaftar
                  </h2>
                  <p className="text-xs text-[#607894]">
                    Sinkron otomatis saat pengguna mendaftar atau masuk ke Sweet Scoop.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#7c94ae] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Cari nama atau email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-xs text-[#173b67] outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-xs text-[#607894] py-8 text-center">
                  Belum ada data pengguna di Realtime Database.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#e6effa] text-[#607894]">
                        <th className="py-2.5 pr-4 font-semibold">Nama</th>
                        <th className="py-2.5 pr-4 font-semibold">Email</th>
                        <th className="py-2.5 pr-4 font-semibold">WhatsApp</th>
                        <th className="py-2.5 pr-4 font-semibold">Peran</th>
                        <th className="py-2.5 font-semibold text-right">Login Terakhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef5fc]">
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-[#f8fbff]">
                          <td className="py-3 pr-4 font-bold text-[#173b67]">{u.name}</td>
                          <td className="py-3 pr-4 font-mono text-[#385675]">{u.email}</td>
                          <td className="py-3 pr-4 font-mono tabular-nums text-[#385675]">
                            {u.phone || '-'}
                          </td>
                          <td className="py-3 pr-4 font-semibold">
                            <span
                              className={
                                u.role === 'admin' ? 'text-[#2563eb]' : 'text-[#58718e]'
                              }
                            >
                              {u.role === 'admin' ? 'Admin Toko' : 'Pelanggan'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono tabular-nums text-[#607894]">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleDateString('id-ID')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* SECTION: MESSAGES & FIREBASE SETTINGS */}
          {section === 'settings' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2563eb]" />
                  <h2 className="text-base font-extrabold text-[#173b67]">
                    Pesan Masuk Pelanggan ({messages.length})
                  </h2>
                </div>

                {messages.length === 0 ? (
                  <p className="text-xs text-[#607894] py-8 text-center">
                    Belum ada pesan masuk dari formulir Hubungi Kami.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {messages.map((m) => (
                      <article
                        key={m.id}
                        className="rounded-xl border border-[#dceafa] bg-[#f8fbff] p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-[#173b67]">{m.name}</span>
                          <span className="font-mono text-[#607894] tabular-nums">
                            {new Date(m.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-xs text-[#2563eb] font-mono">{m.phone}</p>
                        <p className="text-xs text-[#385675] whitespace-pre-line">{m.message}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white rounded-2xl border border-[#dceafa] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#2563eb]" />
                  <h2 className="text-base font-extrabold text-[#173b67]">
                    Konfigurasi Firebase Realtime Database
                  </h2>
                </div>

                <div className="rounded-xl bg-[#f7fbff] border border-[#dceafa] p-3.5 text-xs space-y-1 text-[#385675]">
                  <p>
                    Project ID: <strong className="font-mono text-[#173b67]">sweet-scoop-14e35</strong>
                  </p>
                  <p>
                    Email Admin: <strong className="font-mono text-[#173b67]">{ADMIN_EMAIL}</strong>
                  </p>
                  <p>
                    Status Koneksi:{' '}
                    <strong className={rtdbConnected ? 'text-emerald-700' : 'text-amber-700'}>
                      {rtdbConnected ? 'Terhubung' : 'Belum terhubung (cek URL / Rules)'}
                    </strong>
                  </p>
                </div>

                <form onSubmit={handleSaveRtdbUrl} className="space-y-2.5">
                  <label className="block text-xs font-semibold text-[#385675]">
                    URL Realtime Database (`databaseURL`)
                  </label>
                  <input
                    type="url"
                    required
                    value={rtdbUrlInput}
                    onChange={(e) => setRtdbUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-xs font-mono text-[#173b67] outline-none focus:border-[#2563eb]"
                  />
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRtdbUrlInput(DEFAULT_RTDB_URL)}
                      className="px-2.5 py-1 rounded-lg bg-[#f0f7ff] text-[#2563eb] font-semibold"
                    >
                      Server US (firebaseio.com)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRtdbUrlInput(ASIA_RTDB_URL)}
                      className="px-2.5 py-1 rounded-lg bg-[#f0f7ff] text-[#2563eb] font-semibold"
                    >
                      Server Singapore (asia-southeast1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRtdbUrlInput(EUROPE_RTDB_URL)}
                      className="px-2.5 py-1 rounded-lg bg-[#f0f7ff] text-[#2563eb] font-semibold"
                    >
                      Server Europe (europe-west1)
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold"
                    >
                      Simpan URL &amp; Muat Ulang
                    </button>
                    <button
                      type="button"
                      disabled={detectingRtdb}
                      onClick={handleDetectRtdb}
                      className="px-4 py-2 rounded-xl bg-[#f0f7ff] hover:bg-[#e1effe] border border-[#c7dffb] text-[#173b67] text-xs font-bold flex items-center gap-1.5"
                    >
                      {detectingRtdb ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Deteksi Otomatis Server RTDB</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 pt-2 border-t border-[#e6effa]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#173b67]">
                      Rekomendasi Rules Realtime Database
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyRules}
                      className="text-xs font-semibold text-[#2563eb] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Rules</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-[#14345b] text-blue-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                    {RECOMMENDED_RULES}
                  </pre>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
