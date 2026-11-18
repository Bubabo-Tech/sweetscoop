import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Info,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthScreen } from './components/AuthScreen';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { Navbar } from './components/Navbar';
import { ProductImage } from './components/ProductImage';
import { UserPortalModal } from './components/UserPortalModal';
import {
  buildWhatsAppUrl,
  DEFAULT_PRODUCTS,
  formatRupiah,
  HERO_BANNER_URL,
  STORE_NAME,
  WHATSAPP_NUMBER,
} from './data/defaultProducts';
import {
  formatFirebaseError,
  getCachedProfile,
  isAdminEmail,
  listenToProducts,
  listenToUserProfile,
  logoutUser,
  mergeCatalogProducts,
  submitContactMessage,
  subscribeAuth,
  syncUserRecord,
} from './firebase';
import type { CartItem, Product, ToastNotice, UserProfile } from './types';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminViewOpen, setAdminViewOpen] = useState(false);

  const [rtdbProducts, setRtdbProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | 'Gelato' | 'Ice Cream'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sweet_scoop_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<CartItem | null>(null);
  const [userPortalOpen, setUserPortalOpen] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [sendingContact, setSendingContact] = useState(false);
  const [contactSubmittedWa, setContactSubmittedWa] = useState('');

  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Persist cart locally
  useEffect(() => {
    try {
      localStorage.setItem('sweet_scoop_cart', JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  // Subscribe to Firebase Auth & User Profile
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = subscribeAuth(async (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setUserProfile(null);
        setAdminViewOpen(false);
        setAuthReady(true);
        return;
      }

      const cached = getCachedProfile(firebaseUser.uid);
      const fallbackProfile: UserProfile = cached || {
        uid: firebaseUser.uid,
        name:
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'Pelanggan',
        email: firebaseUser.email || '',
        phone: '',
        address: '',
        role: isAdminEmail(firebaseUser.email) ? 'admin' : 'user',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };
      setUserProfile(fallbackProfile);
      setAdminViewOpen(isAdminEmail(firebaseUser.email));
      setAuthReady(true);

      if (!cached) {
        syncUserRecord(firebaseUser)
          .then((synced) => setUserProfile(synced))
          .catch(() => {});
      }

      unsubProfile = listenToUserProfile(firebaseUser.uid, (profile) => {
        if (profile) {
          setUserProfile(profile);
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Subscribe to Realtime Database Products
  useEffect(() => {
    const unsub = listenToProducts(
      (list) => setRtdbProducts(list),
      (err) => {
        console.warn('Products RTDB listener:', err.message);
      }
    );
    return () => unsub();
  }, []);

  const isAdmin = Boolean(userProfile && isAdminEmail(userProfile.email));

  // Merge RTDB products with active default catalog (respecting deletions/hidden items)
  const catalogProducts = useMemo(
    () => mergeCatalogProducts(rtdbProducts),
    [rtdbProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogProducts.filter((p) => {
      if (categoryFilter !== 'Semua' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [catalogProducts, categoryFilter, searchQuery]);

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty: 1,
        },
      ];
    });
    notify('success', `${product.name} ditambahkan ke keranjang.`);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleAuthSuccess = (profile: UserProfile, isNewRegistration?: boolean) => {
    setUserProfile(profile);

    if (isAdminEmail(profile.email)) {
      setAdminViewOpen(true);
      notify(
        'success',
        isNewRegistration
          ? 'Akun Admin berhasil dibuat dan terhubung ke Dashboard.'
          : 'Selamat datang kembali di Dashboard Admin Sweet Scoop.'
      );
    } else {
      setAdminViewOpen(false);
      notify(
        'success',
        isNewRegistration
          ? `Akun ${profile.name} berhasil didaftarkan.`
          : `Selamat datang kembali, ${profile.name}.`
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setAdminViewOpen(false);
      setUserPortalOpen(false);
      setCartOpen(false);
      setCheckoutOpen(false);
      notify('info', 'Anda telah keluar dari akun.');
    } catch (err) {
      notify('error', formatFirebaseError(err));
    }
  };

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !contactMsg.trim()) return;

    setSendingContact(true);
    try {
      await submitContactMessage({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        message: contactMsg.trim(),
        userId: userProfile?.uid || null,
        email: userProfile?.email || '',
      });
      const waText = `Halo ${STORE_NAME}!\nNama: ${contactName.trim()}\nNo. WhatsApp: ${contactPhone.trim()}\nPesan: ${contactMsg.trim()}`;
      setContactSubmittedWa(buildWhatsAppUrl(waText));
      setContactName('');
      setContactPhone('');
      setContactMsg('');
      notify('success', 'Pesan Anda terkirim dan tersimpan untuk Admin Sweet Scoop.');
    } catch (err) {
      notify('error', formatFirebaseError(err));
    } finally {
      setSendingContact(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f9ff] text-[#173b67] gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#2563eb]" />
        <p className="text-xs font-semibold text-[#58718e]">Memuat Sweet Scoop...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <>
        <AuthScreen onSuccess={handleAuthSuccess} />
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </>
    );
  }

  if (adminViewOpen && isAdmin) {
    return (
      <>
        <AdminDashboard
          adminUser={userProfile}
          rtdbProducts={rtdbProducts}
          onBackToStore={() => setAdminViewOpen(false)}
          onLogout={handleLogout}
          onNotify={notify}
        />
        <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-[#173b67]">
      <Navbar
        cartCount={totalCartItems}
        user={userProfile}
        isAdmin={isAdmin}
        onOpenCart={() => setCartOpen(true)}
        onOpenAuth={() => {}}
        onOpenUserPortal={() => setUserPortalOpen(true)}
        onOpenAdminDashboard={() => setAdminViewOpen(true)}
        onLogout={handleLogout}
      />

      {/* Hero Section */}
      <section
        id="home"
        className="pt-28 pb-16 px-4 sm:px-6 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-10 items-stretch"
      >
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#2563eb] tracking-wide">
              Es Krim &amp; Gelato · Segarnya Bikin Bahagia
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.12] tracking-tight text-[#173b67]">
              Cemilan yang Menyegarkan
            </h1>
            <p className="text-base sm:text-lg text-[#58718e] leading-relaxed max-w-xl">
              Sweet Scoop, satu gigitan membawa kebahagiaan. Nikmati gelato artisan lembut,
              pesan langsung lewat keranjang, dan pantau status pesanan Anda secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#produk"
              className="px-6 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Jelajahi Katalog</span>
            </a>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => setAdminViewOpen(true)}
                className="px-5 py-3.5 rounded-xl bg-[#14345b] hover:bg-[#1d477a] text-white text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Buka Dashboard Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setUserPortalOpen(true)}
                className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#f0f7ff] border border-[#cfe2f7] text-[#173b67] text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <ClipboardList className="w-4 h-4 text-[#2563eb]" />
                <span>Pesanan Saya</span>
              </button>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#58718e]">
            <span>WhatsApp Resmi: {WHATSAPP_NUMBER}</span>
            <span aria-hidden="true">·</span>
            <span>Update Katalog &amp; Pesanan Real-Time</span>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-[#d6e7fb] shadow-lg min-h-[280px] lg:min-h-[380px] bg-white">
          <ProductImage
            src={HERO_BANNER_URL}
            alt="Sweet Scoop Gelato Store"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102b4c]/90 via-[#102b4c]/25 to-transparent flex flex-col justify-end p-6">
            <h2 className="text-xl font-extrabold text-white">Sweet Scoop Official Store</h2>
            <p className="text-xs text-blue-100/90 mt-1 max-w-lg leading-relaxed">
              Berbagai pilihan es krim dan gelato dengan rasa lezat, tekstur lembut, dan bahan
              pilihan dari cokelat, vanila, stroberi, blueberry, hingga matcha.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section
        id="produk"
        className="py-16 px-4 sm:px-6 border-t border-[#d6e6f8] bg-gradient-to-b from-[#e4f1ff]/75 to-[#f3f9ff]"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#2563eb]">
                Katalog Produk Siap Kirim
              </p>
              <h2 className="text-3xl font-extrabold text-[#173b67]">
                Menu Pilihan Minggu Ini
              </h2>
              <p className="text-sm text-[#58718e] max-w-xl">
                Tambahkan ke keranjang untuk menyimpan pesanan ke akun Anda, atau pesan langsung
                melalui WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[#dceafa]">
                {(['Semua', 'Gelato', 'Ice Cream'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-[#2563eb] text-white'
                        : 'text-[#58718e] hover:text-[#173b67]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-[#7c94ae] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari rasa..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#dceafa] text-xs text-[#173b67] outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#dceafa] py-14 text-center space-y-2">
              <p className="text-sm font-bold text-[#173b67]">Varian tidak ditemukan</p>
              <p className="text-xs text-[#607894]">
                Coba ubah kata kunci pencarian atau pilih kategori Semua.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const directWaUrl = buildWhatsAppUrl(
                  `Halo ${STORE_NAME}! Saya ingin memesan:\n• Produk: ${product.name}\n• Harga: ${formatRupiah(
                    product.price
                  )}\n\nApakah stok masih tersedia?`
                );

                return (
                  <article
                    key={product.id}
                    className="rounded-2xl bg-white border border-[#dceafa] shadow-sm hover:shadow-md hover:border-[#9ec8f8] transition-all flex flex-col overflow-hidden"
                  >
                    <div className="aspect-square w-full bg-[#f4f9ff] overflow-hidden">
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#607894]">
                          <span>{product.category}</span>
                          <span className="font-mono font-extrabold text-sm text-[#173b67] tabular-nums">
                            {formatRupiah(product.price)}
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-[#173b67] mt-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#607894] leading-relaxed mt-1.5">
                          {product.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#edf4fc] space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDirectCheckoutItem({
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              image: product.image,
                              qty: 1,
                            });
                            setCheckoutOpen(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Beli Sekarang</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="py-2 px-3 rounded-xl bg-[#f0f7ff] hover:bg-[#e1effe] border border-[#dceafa] text-[#173b67] text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            + Keranjang
                          </button>
                          <a
                            href={directWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="tentang-kami" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="rounded-3xl bg-white/80 border border-[#d7e7f9] p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <p className="text-xs font-semibold text-[#2563eb]">Tentang Kami</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#173b67]">
            Komitmen Kami Terhadap Pelanggan
          </h2>
          <p className="text-sm sm:text-base text-[#58718e] leading-relaxed max-w-2xl mx-auto">
            Sweet Scoop mengusung konsep modern, ceria, dan nyaman dengan nuansa biru yang segar.
            Kami mengutamakan kualitas bahan baku, kebersihan produksi, serta kemudahan pemesanan
            real-time bagi pelanggan maupun pengelolaan toko bagi admin.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="kontak"
        className="py-16 px-4 sm:px-6 border-t border-[#d4e6f8] bg-gradient-to-br from-[#dceeff] to-[#f1f7ff]"
      >
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-[#173b67]">Hubungi Kami</h2>
            <p className="text-xs sm:text-sm text-[#58718e]">
              Kirim pertanyaan seputar produk atau pesanan ke admin kami atau chat langsung via
              WhatsApp{' '}
              <span className="font-mono font-bold text-[#173b67]">{WHATSAPP_NUMBER}</span>.
            </p>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="rounded-2xl bg-white border border-[#d8e8f8] p-6 sm:p-8 space-y-4 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-[#385675] mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#385675] mb-1">
                Nomor WhatsApp / HP
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0812..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#385675] mb-1">
                Pesan Anda
              </label>
              <textarea
                rows={4}
                required
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Tuliskan pertanyaan seputar produk atau pesanan..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sendingContact}
              className="w-full py-3.5 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              {sendingContact && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Kirim Pesan ke Admin</span>
            </button>

            {contactSubmittedWa && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-3 text-xs text-emerald-800">
                <span>Pesan tersimpan! Ingin lanjut chat WhatsApp?</span>
                <a
                  href={contactSubmittedWa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline flex items-center gap-1 shrink-0"
                >
                  <span>Buka WA</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 sm:px-6 bg-[#14345b] text-blue-100/80 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-bold text-white">Sweet Scoop © 2026</p>
          <p>
            WhatsApp:{' '}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 font-mono underline"
            >
              {WHATSAPP_NUMBER}
            </a>
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => (isAdmin ? setAdminViewOpen(true) : setUserPortalOpen(true))}
              className="text-blue-200 hover:text-white underline font-semibold"
            >
              {isAdmin ? 'Dashboard Admin' : 'Pesanan Saya'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="hover:text-white underline"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={() => {
          setCartOpen(false);
          setDirectCheckoutItem(null);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={directCheckoutItem ? [directCheckoutItem] : cart}
        user={userProfile}
        onClose={() => {
          setCheckoutOpen(false);
          setDirectCheckoutItem(null);
        }}
        onOrderCreated={() => {
          if (directCheckoutItem) {
            setDirectCheckoutItem(null);
          } else {
            setCart([]);
          }
        }}
        onOpenAuth={() => {}}
      />

      <UserPortalModal
        open={userPortalOpen}
        user={userProfile}
        onClose={() => setUserPortalOpen(false)}
        onLogout={handleLogout}
        onNotify={notify}
      />

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastNotice[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[90] space-y-2 max-w-sm w-[calc(100vw-2rem)]"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl border px-4 py-3 shadow-lg flex items-start gap-2.5 text-xs font-semibold ${
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : t.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-white border-[#dceafa] text-[#173b67]'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#2563eb]" />
          )}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="opacity-60 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
