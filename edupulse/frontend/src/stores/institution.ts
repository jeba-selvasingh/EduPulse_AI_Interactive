import { create } from 'zustand';

export type Institution = {
  id: string;
  name: string;
  code: string;
};

type InstitutionState = {
  selected: Institution | null;
  setSelected: (institution: Institution | null) => void;
  clear: () => void;
};

export const useInstitutionStore = create<InstitutionState>((set) => ({
  selected: null,
  setSelected: (institution) => set({ selected: institution }),
  clear: () => set({ selected: null }),
}));

export function getSelectedInstitutionId(): string | undefined {
  return useInstitutionStore.getState().selected?.id;
}
