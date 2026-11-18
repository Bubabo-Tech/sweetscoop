import { useState, type FormEvent } from 'react';
import { Loader2, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { HERO_BANNER_URL } from '../data/defaultProducts';
import {
  formatFirebaseError,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
} from '../firebase';
import type { UserProfile } from '../types';
import { ProductImage } from './ProductImage';

interface AuthScreenProps {
  onSuccess: (profile: UserProfile, isNewRegistration?: boolean) => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Alamat email wajib diisi.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await resetPassword(cleanEmail);
        setInfo(
          `Tautan reset password telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau folder spam Anda.`
        );
      } catch (err) {
        setError(formatFirebaseError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Nama lengkap wajib diisi.');
        return;
      }
      if (password.length < 6) {
        setError('Password minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }

      setLoading(true);
      try {
        const profile = await registerWithEmail({
          name: name.trim(),
          email: cleanEmail,
          password,
          phone: phone.trim(),
          address: address.trim(),
        });
        onSuccess(profile, true);
      } catch (err) {
        setError(formatFirebaseError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const profile = await loginWithEmail(cleanEmail, password);
      onSuccess(profile, false);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[#f4f9ff]">
      {/* Left Brand Showcase */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#14345b] text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <span className="w-10 h-10 rounded-xl bg-[#2563eb] text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
            S
          </span>
          <span className="text-2xl font-extrabold tracking-tight">Sweet Scoop</span>
        </div>

        <div className="space-y-6 my-auto py-8 z-10 max-w-lg">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-blue-300">
              Es Krim &amp; Gelato · Official Store
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Cemilan yang Menyegarkan, Satu Gigitan Membawa Kebahagiaan
            </h1>
            <p className="text-sm text-blue-100/85 leading-relaxed">
              Masuk atau buat akun untuk menjelajahi katalog gelato dan es krim Sweet Scoop,
              melakukan pemesanan langsung, dan memantau status pesanan secara real-time.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/15 aspect-[16/10] shadow-xl bg-[#0e2745]">
            <ProductImage
              src={HERO_BANNER_URL}
              alt="Sweet Scoop Gelato"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="text-xs text-blue-200/80 flex items-center gap-4 z-10">
          <span>Sweet Scoop © 2026</span>
          <span aria-hidden="true">·</span>
          <span>Katalog &amp; Pesanan Real-Time</span>
        </div>
      </aside>

      {/* Right Full-Height Login & Register Area */}
      <main className="flex flex-col justify-center items-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center justify-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#2563eb] text-white font-extrabold text-base flex items-center justify-center">
              S
            </span>
            <span className="text-xl font-extrabold tracking-tight text-[#173b67]">
              Sweet Scoop
            </span>
          </div>

          <div className="rounded-2xl bg-white border border-[#dceafa] shadow-xl p-6 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#2563eb]">Portal Akun Sweet Scoop</p>
              <h2 className="text-2xl font-extrabold text-[#173b67] mt-0.5">
                {mode === 'login'
                  ? 'Masuk ke Toko'
                  : mode === 'register'
                  ? 'Daftar / Buat Akun Baru'
                  : 'Reset Password'}
              </h2>
              <p className="text-xs text-[#607894] mt-1">
                Gunakan email dan password untuk masuk sebagai pelanggan maupun admin toko.
              </p>
            </div>

            {mode !== 'reset' && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#f0f7ff] border border-[#dceafa]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setInfo('');
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                    mode === 'login'
                      ? 'bg-white text-[#173b67] shadow-sm'
                      : 'text-[#58718e] hover:text-[#173b67]'
                  }`}
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setInfo('');
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-colors ${
                    mode === 'register'
                      ? 'bg-white text-[#173b67] shadow-sm'
                      : 'text-[#58718e] hover:text-[#173b67]'
                  }`}
                >
                  Daftar Akun
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#385675] mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#385675] mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#385675] mb-1">
                      Nomor WhatsApp (Opsional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0812..."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#385675] mb-1">
                      Alamat Pengiriman (Opsional)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Jalan, nomor rumah, kota"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#385675]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError('');
                          setInfo('');
                        }}
                        className="text-[11px] font-semibold text-[#2563eb] hover:underline"
                      >
                        Lupa password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#385675] mb-1">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7c94ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#f5f9ff] border border-[#d6e5f5] text-sm text-[#173b67] outline-none focus:border-[#2563eb] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium"
                >
                  {error}
                </div>
              )}

              {info && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-700 font-medium">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {mode === 'login'
                    ? 'Masuk Sekarang'
                    : mode === 'register'
                    ? 'Buat Akun & Masuk'
                    : 'Kirim Email Reset Password'}
                </span>
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setInfo('');
                  }}
                  className="w-full py-2 text-xs font-semibold text-[#58718e] hover:text-[#173b67]"
                >
                  Kembali ke Login
                </button>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
