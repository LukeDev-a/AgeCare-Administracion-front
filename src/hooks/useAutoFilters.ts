import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

/** Aplica filtros válidos y reinicia la página en una sola actualización. */
export function useAutoFilters<T extends object>(initial: T, options: {
  delayedKeys?: readonly (keyof T)[]; validate?: (value: T) => string; delay?: number;
} = {}) {
  const { delayedKeys = [], validate = () => '', delay = 400 } = options;
  const [draft, setDraft] = useState<T>({ ...initial });
  const [query, setQuery] = useState({ filters: { ...initial }, page: 1 });
  const control = useRef({ draft: { ...initial }, initial: { ...initial }, generation: 0,
    timer: null as ReturnType<typeof setTimeout> | null });
  function cancel() {
    control.current.generation++;
    if (control.current.timer !== null) clearTimeout(control.current.timer);
    control.current.timer = null;
  }
  useEffect(() => () => {
    control.current.generation++;
    if (control.current.timer !== null) clearTimeout(control.current.timer);
  }, []);
  function commit(next: T) {
    setQuery(current => JSON.stringify(current.filters) === JSON.stringify(next) ? current : { filters: next, page: 1 });
  }
  function setField<K extends keyof T>(key: K, value: T[K], immediate = false) {
    cancel();
    const next = { ...control.current.draft, [key]: value };
    control.current.draft = next; setDraft(next);
    if (validate(next)) return;
    if (immediate || !delayedKeys.includes(key)) { commit(next); return; }
    const generation = control.current.generation;
    control.current.timer = setTimeout(() => {
      if (generation !== control.current.generation) return;
      control.current.timer = null; commit(next);
    }, delay);
  }
  function replace(next: T) {
    cancel(); control.current.draft = { ...next }; setDraft({ ...next });
    if (!validate(next)) setQuery({ filters: { ...next }, page: 1 });
  }
  function reset() { replace(control.current.initial); }
  const setPage = useCallback((value: SetStateAction<number>) => {
    setQuery(current => ({ ...current, page: typeof value === 'function' ? value(current.page) : value }));
  }, []);
  return { draft, filters: query.filters, page: query.page, setPage, setField, replace, reset,
    pending: JSON.stringify(draft) !== JSON.stringify(query.filters), error: validate(draft) };
}

export function integerFilter(value: string, min: number, max: number, label: string) {
  const number = Number(value);
  return value.trim() && Number.isInteger(number) && number >= min && number <= max ? '' : `${label}: introduce un número entero entre ${min} y ${max}.`;
}
