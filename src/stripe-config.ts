export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: string;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_SstdJiFTZ1nLkY',
    priceId: 'price_1Rx7qeETBte9tCIcutDIt3St',
    name: 'Glow Guide Monthly Subscription',
    description: 'Your personal beauty & wellness companion with monthly insights and personalized transformation plans',
    mode: 'subscription',
    price: '$4.99/month'
  }
];

export const getProductById = (id: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};