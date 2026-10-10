import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// Which floating tools are open (the calculator and the note), and which one
// was touched last, so it sits on top.
export type ToolId = 'calculator' | 'note';
type ToolsValue = {
  open: Record<ToolId, boolean>;
  z: Record<ToolId, number>;
  toggle: (id: ToolId) => void;
  close: (id: ToolId) => void;
  front: (id: ToolId) => void;
};

const ToolsContext = createContext<ToolsValue>({ open: { calculator: false, note: false }, z: { calculator: 1, note: 2 }, toggle: () => {}, close: () => {}, front: () => {} });

export function ToolsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Record<ToolId, boolean>>({ calculator: false, note: false });
  const [z, setZ] = useState<Record<ToolId, number>>({ calculator: 1, note: 2 });
  const top = useRef(2);
  const front = useCallback((id: ToolId) => setZ((s) => ({ ...s, [id]: ++top.current })), []);
  const toggle = useCallback(
    (id: ToolId) => {
      setOpen((s) => ({ ...s, [id]: !s[id] }));
      front(id);
    },
    [front],
  );
  const close = useCallback((id: ToolId) => setOpen((s) => ({ ...s, [id]: false })), []);
  return <ToolsContext.Provider value={{ open, z, toggle, close, front }}>{children}</ToolsContext.Provider>;
}

export const useTools = () => useContext(ToolsContext);
