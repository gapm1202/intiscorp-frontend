import React, { createContext, useContext, useMemo, useRef } from 'react';

type GuardFn = (nextPath: string) => boolean;
type OnBlockFn = (nextPath: string) => void;

interface NavGuardAPI {
  registerGuard: (shouldBlock: GuardFn, onBlock: OnBlockFn) => void;
  clearGuard: () => void;
  getGuard: () => { shouldBlock?: GuardFn; onBlock?: OnBlockFn };
}

const NavGuardContext = createContext<NavGuardAPI | null>(null);

export const NavGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shouldBlockRef = useRef<GuardFn | undefined>(undefined);
  const onBlockRef = useRef<OnBlockFn | undefined>(undefined);

  const api = useMemo<NavGuardAPI>(() => ({
    registerGuard: (shouldBlock, onBlock) => {
      shouldBlockRef.current = shouldBlock;
      onBlockRef.current = onBlock;
    },
    clearGuard: () => {
      shouldBlockRef.current = undefined;
      onBlockRef.current = undefined;
    },
    getGuard: () => ({ shouldBlock: shouldBlockRef.current, onBlock: onBlockRef.current }),
  }), []);

  return (
    <NavGuardContext.Provider value={api}>
      {children}
    </NavGuardContext.Provider>
  );
};

export const useNavGuard = () => {
  const ctx = useContext(NavGuardContext);
  if (!ctx) throw new Error('useNavGuard must be used within NavGuardProvider');
  return ctx;
};
