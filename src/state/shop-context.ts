import { createContext, useContext } from 'react';

export type ShopConnectionValue = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
};

export const ShopConnectionContext = createContext<ShopConnectionValue | null>(null);

export function useShopConnection() {
  const value = useContext(ShopConnectionContext);
  if (!value) {
    throw new Error('useShopConnection must be used inside ShopProvider');
  }
  return value;
}
