import { useState } from 'react';
import {
  ShoppingBag,
  User,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ClipboardList,
} from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  cartCount: number;
  user: UserProfile | null;
  isAdmin: boolean;
  onOpenCart: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenUserPortal: () => void;
  onOpenAdminDashboard: () => void;
  onLogout: () => void;
}

export function Navbar({
  cartCount,
  user,
  isAdmin,
  onOpenCart,
  onOpenAuth,
  onOpenUserPortal,
  onOpenAdminDashboard,
  onLogout,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#14345b]/95 backdrop-blur-md border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#home"
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-[#2563eb] text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
            S
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Sweet Scoop
          </span>
        </a>

        {/* Zone 2: Single-line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-blue-100/85">
          <a
            href="#produk"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Katalog
          </a>
          <a
            href="#tentang-kami"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Tentang Kami
          </a>
          <a
            href="#kontak"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Kontak
          </a>
          {user ? (
            isAdmin ? (
              <button
                type="button"
                onClick={onOpenAdminDashboard}
                className="text-blue-200 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Dashboard Admin
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenUserPortal}
                className="text-blue-200 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Pesanan Saya
              </button>
            )
          ) : (
            <a
              href="#home"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Beranda
            </a>
          )}
        </nav>

        {/* Zone 3: Cart + Primary Account Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Buka keranjang belanja"
            className="relative h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Keranjang</span>
            <span className="min-w-5 h-5 px-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold tabular-nums flex items-center justify-center">
              {cartCount}
            </span>
          </button>

          {user ? (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="h-10 px-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                ) : (
                  <User className="w-4 h-4 shrink-0" />
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-[#dceafa] shadow-xl py-2 text-[#173b67]"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-[#e8f1fb]">
                    <p className="text-xs font-bold truncate">{user.name}</p>
                    <p className="text-[11px] text-[#58718e] truncate">{user.email}</p>
                    <p className="text-[11px] font-semibold text-[#2563eb] mt-0.5">
                      {isAdmin ? 'Admin Toko' : 'Akun Pelanggan'}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAdminDashboard();
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f0f7ff] flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
                      <span>Buka Dashboard Admin</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenUserPortal();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f0f7ff] flex items-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4 text-[#2563eb]" />
                    <span>Pesanan & Profil Saya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-[#e8f1fb] mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hidden md:flex h-10 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <User className="w-4 h-4" />
              <span>Masuk / Daftar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu navigasi"
            className="md:hidden h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#14345b] border-b border-white/10 px-5 py-4 space-y-2 shadow-xl">
          <a
            href="#produk"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-blue-100 hover:text-white"
          >
            Katalog Produk
          </a>
          <a
            href="#tentang-kami"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-blue-100 hover:text-white"
          >
            Tentang Kami
          </a>
          <a
            href="#kontak"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-blue-100 hover:text-white"
          >
            Kontak
          </a>

          <div className="pt-2 border-t border-white/10 space-y-2">
            {user ? (
              <>
                <div className="py-1 text-xs text-blue-200">
                  Masuk sebagai <strong className="text-white">{user.name}</strong> ({user.email})
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      onOpenAdminDashboard();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2563eb] text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Dashboard Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenUserPortal();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Pesanan & Profil Saya</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-semibold"
                >
                  Keluar Akun
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold"
                >
                  Masuk Akun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('register');
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  Daftar Akun
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
