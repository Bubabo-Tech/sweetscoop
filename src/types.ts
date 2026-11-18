export type UserRole = 'admin' | 'user';

export type OrderStatus = 'Baru' | 'Diproses' | 'Selesai' | 'Dibatalkan';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  createdAt: number;
  lastLoginAt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: 'Gelato' | 'Ice Cream' | 'Lainnya';
  createdAt?: number;
  isDefault?: boolean;
  hidden?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
}

export interface OrderItem {
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  userId: string | null;
  userEmail: string;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  userId?: string | null;
  email?: string;
  createdAt: number;
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
