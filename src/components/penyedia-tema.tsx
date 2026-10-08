"use client";

import { createContext, useContext } from "react";
import type { TemaSitus } from "@/lib/tema";
import { TEMA_BAWAAN } from "@/lib/tema";

const KonteksTema = createContext<TemaSitus>(TEMA_BAWAAN);

export function PenyediaTema({
  tema,
  children,
}: {
  tema: TemaSitus;
  children: React.ReactNode;
}) {
  return <KonteksTema.Provider value={tema}>{children}</KonteksTema.Provider>;
}

export function useTema(): TemaSitus {
  return useContext(KonteksTema);
}
