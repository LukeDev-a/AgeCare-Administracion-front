export const legalStyles = {
  panel: 'tw:space-y-5 tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-6',
  heading: 'tw:text-xl tw:font-bold tw:tracking-tight',
  muted: 'tw:text-sm tw:leading-relaxed tw:text-muted',
  button: 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand',
  primary: 'tw:enabled:border-brand tw:enabled:bg-brand-soft tw:enabled:text-brand-ink',
  field: 'tw:min-h-11 tw:w-full tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:font-sans tw:text-base tw:font-normal tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand',
  label: 'tw:grid tw:min-w-0 tw:content-start tw:gap-2 tw:text-sm tw:font-semibold',
  actions: 'tw:flex tw:flex-wrap tw:items-center tw:gap-3',
  section: 'tw:space-y-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-4 tw:sm:p-5',
  notice: 'tw:rounded-xl tw:bg-canvas tw:p-4 tw:text-sm tw:leading-relaxed tw:text-muted',
  error: 'tw:rounded-xl tw:bg-warning-bg tw:p-4 tw:text-sm tw:leading-relaxed tw:text-ink',
  badge: 'tw:inline-flex tw:items-center tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1 tw:text-xs tw:font-semibold',
};
export function legalStateColor(state: string) {
  return state === 'current' ? 'tw:text-positive' : state === 'scheduled' ? 'tw:text-brand-ink' : state === 'draft' ? 'tw:text-warning' : 'tw:text-muted';
}
