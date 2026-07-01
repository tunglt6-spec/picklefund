/**
 * UDP-01 — Design tokens helper (frontend).
 * Module accent → CSS variable (Design Source of Truth = UDP-01; tokens trong index.css).
 */
export type ModuleAccent =
  | 'green'
  | 'blue'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'teal';

export interface AccentVars {
  /** Màu accent đậm (text/icon/bar). */
  readonly color: string;
  /** Nền mềm của accent (badge/icon bg). */
  readonly soft: string;
}

/** Trả về CSS var theo accent module (dùng inline style). */
export function accentVars(accent: ModuleAccent = 'green'): AccentVars {
  const map: Record<ModuleAccent, AccentVars> = {
    green: { color: 'var(--pf-green)', soft: 'var(--pf-green-soft)' },
    blue: { color: 'var(--pf-accent-blue)', soft: 'var(--pf-accent-blue-soft)' },
    violet: {
      color: 'var(--pf-accent-violet)',
      soft: 'var(--pf-accent-violet-soft)',
    },
    amber: { color: 'var(--pf-accent-amber)', soft: 'var(--pf-accent-amber-soft)' },
    rose: { color: 'var(--pf-accent-rose)', soft: 'var(--pf-accent-rose-soft)' },
    teal: { color: 'var(--pf-accent-teal)', soft: 'var(--pf-accent-teal-soft)' },
  };
  return map[accent];
}
