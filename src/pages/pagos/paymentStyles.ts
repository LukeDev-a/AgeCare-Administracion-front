export const paymentStyles = {
  panel: 'tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-5 tw:sm:p-6',
  muted: 'tw:text-sm tw:leading-relaxed tw:text-muted',
  button: 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand',
  field: 'tw:min-h-11 tw:w-full tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:px-3 tw:py-2.5 tw:text-base tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand',
  label: 'tw:grid tw:gap-2 tw:text-sm tw:font-semibold',
  actions: 'tw:flex tw:flex-wrap tw:items-center tw:gap-3',
  section: 'tw:space-y-4 tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:p-5',
  notice: 'tw:rounded-xl tw:bg-canvas tw:p-4 tw:text-sm tw:leading-relaxed',
  badge: 'tw:inline-block tw:rounded-full tw:bg-canvas tw:px-3 tw:py-1 tw:text-sm tw:font-semibold',
  scroll: 'tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-stroke',
  table: 'tw:w-full tw:min-w-[850px] tw:border-collapse tw:text-left tw:text-sm tw:[&_th]:bg-canvas tw:[&_th]:px-4 tw:[&_th]:py-4 tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-stroke tw:[&_td]:px-4 tw:[&_td]:py-5',
};
export function paymentColor(state: string) {
  return state === 'active' || state === 'approved' ? 'tw:text-positive'
    : state === 'failed' || state === 'cancelled' ? 'tw:text-negative'
    : state === 'pending' || state === 'past_due' ? 'tw:text-warning' : 'tw:text-brand-ink';
}
