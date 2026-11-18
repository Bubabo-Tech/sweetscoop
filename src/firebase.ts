import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  get,
  onValue,
  query,
  orderByChild,
  equalTo,
  type Database,
  type Unsubscribe,
} from 'firebase/database';
import { ADMIN_EMAIL, DEFAULT_PRODUCTS } from './data/defaultProducts';
import type {
  ContactMessage,
  Order,
  OrderStatus,
  Product,
  UserProfile,
} from './types';

const RTDB_URL_STORAGE_KEY = 'sweet_scoop_rtdb_url';
export const DEFAULT_RTDB_URL = 'https://sweet-scoop-14e35-default-rtdb.firebaseio.com';
export const ASIA_RTDB_URL =
  'https://sweet-scoop-14e35-default-rtdb.asia-southeast1.firebasedatabase.app';
export const EUROPE_RTDB_URL =
  'https://sweet-scoop-14e35-default-rtdb.europe-west1.firebasedatabase.app';

export async function detectWorkingRtdbUrl(): Promise<string | null> {
  const candidates = [DEFAULT_RTDB_URL, ASIA_RTDB_URL, EUROPE_RTDB_URL];
  for (const url of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(`${url}/.json?shallow=true`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 200 || res.status === 401 || res.status === 403) {
        return url;
      }
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

export function getRtdbUrl(): string {
  try {
    const saved = localStorage.getItem(RTDB_URL_STORAGE_KEY);
    if (saved && saved.startsWith('https://')) {
      return saved.trim();
    }
  } catch {
    // Ignore storage read issues
  }
  return DEFAULT_RTDB_URL;
}

export function setRtdbUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  localStorage.setItem(RTDB_URL_STORAGE_KEY, cleaned);
}

export const firebaseConfig = {
  apiKey: 'AIzaSyBQoRSvcSbwKfJeNHGUo3yQPM1GIZHleAM',
  authDomain: 'sweet-scoop-14e35.firebaseapp.com',
  databaseURL: getRtdbUrl(),
  projectId: 'sweet-scoop-14e35',
  storageBucket: 'sweet-scoop-14e35.firebasestorage.app',
  messagingSenderId: '12669371768',
  appId: '1:12669371768:web:acc6b08ecec6305238f48d',
  measurementId: 'G-G4DWPNXHJB',
};

const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: Database | null = null;
try {
  dbInstance = getDatabase(app, getRtdbUrl());
} catch (err) {
  console.error('Firebase Realtime Database init error:', err);
}

export const db = dbInstance;

export function isAdminEmail(email?: string | null): boolean {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function formatFirebaseError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err ?? '');

  switch (code) {
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan oleh administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau password tidak sesuai. Jika belum punya akun, silakan pilih tab Daftar Akun.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk melalui tab Masuk.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit.';
    case 'auth/operation-not-allowed':
      return 'Metode login Email/Password belum diaktifkan di Firebase Console (Authentication → Sign-in method).';
    case 'PERMISSION_DENIED':
      return 'Akses Firebase Realtime Database ditolak (Permission Denied). Periksa Rules di Firebase Console.';
    default:
      if (message.toLowerCase().includes('permission_denied') || message.toLowerCase().includes('permission denied')) {
        return 'Akses Firebase Realtime Database ditolak. Pastikan Rules Realtime Database sudah diatur dengan benar.';
      }
      return message || 'Terjadi kesalahan pada layanan Firebase.';
  }
}

const syncedRecently = new Map<string, UserProfile>();

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function getCachedProfile(uid: string): UserProfile | undefined {
  return syncedRecently.get(uid);
}

export function subscribeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function syncUserRecord(
  user: User,
  overrides?: { name?: string; phone?: string; address?: string }
): Promise<UserProfile> {
  const email = (user.email ?? '').trim().toLowerCase();
  const role = isAdminEmail(email) ? 'admin' : 'user';
  const now = Date.now();
  const cached = syncedRecently.get(user.uid);
  const fallbackProfile: UserProfile = {
    uid: user.uid,
    name:
      overrides?.name?.trim() ||
      cached?.name ||
      user.displayName ||
      email.split('@')[0] ||
      'Pelanggan',
    email,
    phone: overrides?.phone?.trim() || cached?.phone || '',
    address: overrides?.address?.trim() || cached?.address || '',
    role,
    createdAt: cached?.createdAt || now,
    lastLoginAt: now,
  };

  if (!db) return fallbackProfile;

  const userRef = ref(db, `users/${user.uid}`);
  try {
    const snap = await withTimeout(
      get(userRef),
      2000,
      'RTDB sync timeout'
    );
    if (snap.exists()) {
      const existing = snap.val() as Partial<UserProfile>;
      const updated: UserProfile = {
        uid: user.uid,
        name: overrides?.name?.trim() || existing.name || fallbackProfile.name,
        email: email || existing.email || '',
        phone:
          overrides?.phone !== undefined
            ? overrides.phone.trim()
            : existing.phone || fallbackProfile.phone,
        address:
          overrides?.address !== undefined
            ? overrides.address.trim()
            : existing.address || fallbackProfile.address,
        role,
        createdAt: existing.createdAt || now,
        lastLoginAt: now,
      };
      syncedRecently.set(user.uid, updated);
      update(userRef, {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        role: updated.role,
        lastLoginAt: updated.lastLoginAt,
      }).catch(() => {});
      return updated;
    } else {
      syncedRecently.set(user.uid, fallbackProfile);
      set(userRef, fallbackProfile).catch(() => {});
      return fallbackProfile;
    }
  } catch {
    return fallbackProfile;
  }
}

export async function registerWithEmail(params: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}): Promise<UserProfile> {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = (params.phone || '').trim();
  const cleanAddress = (params.address || '').trim();

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  const now = Date.now();
  const profile: UserProfile = {
    uid: cred.user.uid,
    name: cleanName || cleanEmail.split('@')[0] || 'Pelanggan',
    email: cleanEmail,
    phone: cleanPhone,
    address: cleanAddress,
    role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
    createdAt: now,
    lastLoginAt: now,
  };

  syncedRecently.set(cred.user.uid, profile);

  if (cleanName) {
    updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
  }
  if (db) {
    set(ref(db, `users/${cred.user.uid}`), profile).catch((err) => {
      console.warn('Background RTDB user write failed:', err);
    });
  }

  return profile;
}

export async function loginWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const cleanEmail = (cred.user.email ?? email).trim().toLowerCase();
  const now = Date.now();
  const quickProfile: UserProfile = {
    uid: cred.user.uid,
    name: cred.user.displayName || cleanEmail.split('@')[0] || 'Pelanggan',
    email: cleanEmail,
    phone: '',
    address: '',
    role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
    createdAt: now,
    lastLoginAt: now,
  };

  // Sync in background with max 400ms wait so login never hangs
  const synced = await Promise.race([
    syncUserRecord(cred.user),
    new Promise<UserProfile>((resolve) => setTimeout(() => resolve(quickProfile), 400)),
  ]);
  syncedRecently.set(cred.user.uid, synced);
  return synced;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  syncedRecently.clear();
  await signOut(auth);
}

export function listenToRtdbConnection(callback: (connected: boolean) => void): Unsubscribe {
  if (!db) {
    callback(false);
    return () => {};
  }
  return onValue(
    ref(db, '.info/connected'),
    (snap) => callback(Boolean(snap.val())),
    () => callback(false)
  );
}

export function listenToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  if (!db) return () => {};
  return onValue(
    ref(db, `users/${uid}`),
    (snap) => {
      if (snap.exists()) {
        callback(snap.val() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('listenToUserProfile error:', err);
    }
  );
}

export async function saveUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'name' | 'phone' | 'address'>>
): Promise<void> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  await update(ref(db, `users/${uid}`), patch);
  if (auth.currentUser && patch.name) {
    await updateProfile(auth.currentUser, { displayName: patch.name });
  }
}

function defaultHiddenKey(name: string): string {
  return (
    'hidden-' +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}

const DEFAULT_NAME_SET = new Set(
  DEFAULT_PRODUCTS.map((d) => d.name.trim().toLowerCase())
);

export function mergeCatalogProducts(rtdbEntries: Product[]): Product[] {
  const hiddenNames = new Set(
    rtdbEntries
      .filter((p) => p.hidden)
      .map((p) => p.name.trim().toLowerCase())
  );
  const activeRtdb = rtdbEntries.filter((p) => !p.hidden);
  const activeRtdbNames = new Set(
    activeRtdb.map((p) => p.name.trim().toLowerCase())
  );
  const activeDefaults = DEFAULT_PRODUCTS.filter((d) => {
    const key = d.name.trim().toLowerCase();
    return !hiddenNames.has(key) && !activeRtdbNames.has(key);
  });
  return [...activeRtdb, ...activeDefaults];
}

export function listenToProducts(
  callback: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onValue(
    ref(db, 'products'),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const raw = snap.val() as Record<string, Omit<Product, 'id'>>;
      const list: Product[] = Object.entries(raw).map(([id, val]) => ({
        id,
        name: val.name || 'Produk Sweet Scoop',
        price: Number(val.price || 0),
        image: val.image || '',
        description: val.description || 'Gelato dan es krim lezat dengan kualitas terbaik.',
        category: val.category || 'Gelato',
        createdAt: val.createdAt || 0,
        hidden: Boolean(val.hidden),
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function addProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'isDefault' | 'hidden'>
): Promise<string> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  const hiddenKey = defaultHiddenKey(product.name);
  await remove(ref(db, `products/${hiddenKey}`)).catch(() => {});

  const newRef = push(ref(db, 'products'));
  await withTimeout(
    set(newRef, {
      ...product,
      createdAt: Date.now(),
    }),
    10000,
    'Upload produk timeout. Periksa URL Realtime Database atau ukuran foto.'
  );
  return newRef.key || '';
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, 'id' | 'isDefault' | 'hidden'>>
): Promise<void> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  await withTimeout(
    update(ref(db, `products/${id}`), patch),
    10000,
    'Pembaruan produk timeout. Periksa koneksi Realtime Database.'
  );
}

export async function deleteProduct(id: string, productName?: string): Promise<void> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  if (!id.startsWith('default-')) {
    await withTimeout(
      remove(ref(db, `products/${id}`)),
      6000,
      'Penghapusan produk timeout.'
    );
  }
  if (productName && DEFAULT_NAME_SET.has(productName.trim().toLowerCase())) {
    const hiddenKey = defaultHiddenKey(productName);
    await withTimeout(
      set(ref(db, `products/${hiddenKey}`), {
        name: productName.trim(),
        hidden: true,
        createdAt: Date.now(),
      }),
      6000,
      'Gagal menyembunyikan menu bawaan di database.'
    );
  }
}

export async function seedDefaultProducts(): Promise<number> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  const snap = await withTimeout(
    get(ref(db, 'products')),
    6000,
    'Gagal membaca data produk dari Realtime Database.'
  );
  const existingActiveNames = new Set<string>();
  const hiddenIdsToClear: string[] = [];

  if (snap.exists()) {
    const val = snap.val() as Record<string, { name?: string; hidden?: boolean }>;
    Object.entries(val).forEach(([id, item]) => {
      if (item.hidden) {
        hiddenIdsToClear.push(id);
      } else if (item.name) {
        existingActiveNames.add(item.name.trim().toLowerCase());
      }
    });
  }

  for (const hiddenId of hiddenIdsToClear) {
    await remove(ref(db, `products/${hiddenId}`)).catch(() => {});
  }

  let added = 0;
  for (const item of DEFAULT_PRODUCTS) {
    if (!existingActiveNames.has(item.name.trim().toLowerCase())) {
      const newRef = push(ref(db, 'products'));
      await withTimeout(
        set(newRef, {
          name: item.name,
          price: item.price,
          image: item.image,
          description: item.description,
          category: item.category,
          createdAt: Date.now() - added * 1000,
        }),
        6000,
        'Gagal menyinkronkan menu bawaan ke Realtime Database.'
      );
      added++;
    }
  }
  return added + hiddenIdsToClear.length;
}

export async function createOrder(
  payload: Omit<Order, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  const newRef = push(ref(db, 'orders'));
  await withTimeout(
    set(newRef, {
      ...payload,
      status: 'Baru',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    6000,
    'Koneksi Realtime Database lambat atau belum aktif. Periksa URL/Rules Realtime Database di Firebase Console.'
  );
  return newRef.key || '';
}

function mapOrdersSnapshot(raw: Record<string, Omit<Order, 'id'>>): Order[] {
  return Object.entries(raw)
    .map(([id, val]) => ({
      id,
      userId: val.userId ?? null,
      userEmail: val.userEmail || '',
      customerName: val.customerName || 'Pelanggan',
      phone: val.phone || '-',
      address: val.address || '',
      note: val.note || '',
      items: Array.isArray(val.items) ? val.items : [],
      total: Number(val.total || 0),
      status: (val.status as OrderStatus) || 'Baru',
      createdAt: Number(val.createdAt || 0),
      updatedAt: val.updatedAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listenToAllOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onValue(
    ref(db, 'orders'),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      callback(mapOrdersSnapshot(snap.val() as Record<string, Omit<Order, 'id'>>));
    },
    (err) => onError?.(err)
  );
}

export function listenToUserOrders(
  uid: string,
  email: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const database = db;
  let activeUnsub: Unsubscribe = () => {};
  let fallbackUsed = false;

  const userOrdersQuery = query(
    ref(database, 'orders'),
    orderByChild('userId'),
    equalTo(uid)
  );

  activeUnsub = onValue(
    userOrdersQuery,
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      callback(mapOrdersSnapshot(snap.val() as Record<string, Omit<Order, 'id'>>));
    },
    (err) => {
      if (!fallbackUsed) {
        fallbackUsed = true;
        activeUnsub = onValue(
          ref(database, 'orders'),
          (snap) => {
            if (!snap.exists()) {
              callback([]);
              return;
            }
            const all = mapOrdersSnapshot(snap.val() as Record<string, Omit<Order, 'id'>>);
            const normalizedEmail = email.trim().toLowerCase();
            callback(
              all.filter(
                (o) =>
                  o.userId === uid ||
                  (normalizedEmail && o.userEmail.trim().toLowerCase() === normalizedEmail)
              )
            );
          },
          (fallbackErr) => onError?.(fallbackErr)
        );
      } else {
        onError?.(err);
      }
    }
  );

  return () => activeUnsub();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  await update(ref(db, `orders/${orderId}`), {
    status,
    updatedAt: Date.now(),
  });
}

export async function deleteOrder(orderId: string): Promise<void> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  await remove(ref(db, `orders/${orderId}`));
}

export function listenToAllUsers(
  callback: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onValue(
    ref(db, 'users'),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const raw = snap.val() as Record<string, UserProfile>;
      const list = Object.entries(raw)
        .map(([uid, val]) => ({
          ...val,
          uid: val.uid || uid,
          role: isAdminEmail(val.email) ? ('admin' as const) : ('user' as const),
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (err) => onError?.(err)
  );
}

export async function submitContactMessage(payload: {
  name: string;
  phone: string;
  message: string;
  userId?: string | null;
  email?: string;
}): Promise<string> {
  if (!db) throw new Error('Realtime Database belum terhubung.');
  const newRef = push(ref(db, 'messages'));
  await withTimeout(
    set(newRef, {
      ...payload,
      createdAt: Date.now(),
    }),
    6000,
    'Koneksi Realtime Database lambat atau belum aktif. Pesan gagal dikirim.'
  );
  return newRef.key || '';
}

export function listenToMessages(
  callback: (messages: ContactMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  return onValue(
    ref(db, 'messages'),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const raw = snap.val() as Record<string, Omit<ContactMessage, 'id'>>;
      const list = Object.entries(raw)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (err) => onError?.(err)
  );
}
