import { useMemo, useState, type ReactNode } from 'react';
import { ShopConnectionContext } from './shop-context.ts';

export function ShopProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(true);
  const value = useMemo(
    () => ({
      connected,
      connect: () => setConnected(true),
      disconnect: () => setConnected(false),
    }),
    [connected],
  );

  return <ShopConnectionContext.Provider value={value}>{children}</ShopConnectionContext.Provider>;
}
