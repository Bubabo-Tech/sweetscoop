import type { Product } from '../types';

export const STORE_NAME = 'Sweet Scoop';
export const WHATSAPP_NUMBER = '6281347479530';
export const ADMIN_EMAIL = 'deouraydahlan103@gmail.com';
export const HERO_BANNER_URL = 'https://i.imgur.com/GggFmy1.png';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'default-strawberry-gelato',
    name: 'Strawberry Gelato',
    price: 30000,
    image: 'https://i.imgur.com/8aZF7qk.jpeg',
    description: 'Gelato stroberi segar dengan tekstur lembut dan rasa manis asam seimbang.',
    category: 'Gelato',
    isDefault: true,
  },
  {
    id: 'default-blueberry-gelato',
    name: 'BlueBerry Gelato',
    price: 30000,
    image: 'https://i.imgur.com/2SmdYcr.jpeg',
    description: 'Gelato blueberry pilihan dengan aroma buah segar dan sensasi creamy.',
    category: 'Gelato',
    isDefault: true,
  },
  {
    id: 'default-matcha-gelato',
    name: 'Matcha Gelato',
    price: 30000,
    image: 'https://i.imgur.com/yIvgwTe.jpeg',
    description: 'Gelato teh hijau matcha autentik dengan cita rasa lembut dan kaya.',
    category: 'Gelato',
    isDefault: true,
  },
  {
    id: 'default-chocolate-ice-cream',
    name: 'Chocolate Ice Cream',
    price: 15000,
    image: 'https://i.imgur.com/L0Xj56l.jpeg',
    description: 'Es krim cokelat klasik yang pekat, lembut, dan disukai semua kalangan.',
    category: 'Ice Cream',
    isDefault: true,
  },
  {
    id: 'default-vanilla-ice-cream',
    name: 'Vanilla Ice Cream',
    price: 15000,
    image: 'https://i.imgur.com/MhJnh9d.png',
    description: 'Es krim vanila lembut dengan aroma manis alami yang menyegarkan.',
    category: 'Ice Cream',
    isDefault: true,
  },
];

export function formatRupiah(amount: number): string {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
