import { useEffect, useState, type FormEvent } from 'react';
import { X, Mail, Lock, Phone, MapPin, Loader2, User } from 'lucide-react';
import {
  formatFirebaseError,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
} from '../firebase';
import type { UserProfile } from '../types';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (profile: UserProfile, isNewRegistration?: boolean) => void;
}

export function AuthModal({
  open,
  initialMode,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
    setInfo('');
    setPassword('');
    setConfirmPassword('');
  }, [open, initialMode]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 bg-[#0f2948]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#dceafa] shadow-2xl overflow-hidden my-auto">
        <div className="px-6 pt-5 pb-4 border-b border-[#e6effa] flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#2563eb]">Akun Sweet Scoop</p>
            <h2 id="auth-modal-title" className="text-xl font-extrabold text-[#173b67] mt-0.5">
              {mode === 'login'
                ? 'Masuk ke Akun Anda'
                : mode === 'register'
                ? 'Daftar / Buat Akun Baru'
                : 'Reset Password'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela login"
            className="w-9 h-9 rounded-xl text-[#58718e] hover:text-[#173b67] hover:bg-[#f0f7ff] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode !== 'reset' && (
            <div className="flex border-b border-[#e6effa]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setInfo('');
                }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-[#607894] hover:text-[#173b67]'
                }`}
              >
                Masuk (Sudah Punya Akun)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setInfo('');
                }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-[#2563eb] text-[#2563eb]'
                    : 'border-transparent text-[#607894] hover:text-[#173b67]'
                }`}
              >
                Daftar / Buat Akun
              </button>
            </div>
          )}

          <p className="text-xs text-[#58718e]">
            Masuk atau daftar dengan email dan password untuk pelanggan maupun admin toko.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
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
              className="w-full py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login'
                  ? 'Masuk Sekarang'
                  : mode === 'register'
                  ? 'Buat Akun Sekarang'
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
    </div>
  );
}
