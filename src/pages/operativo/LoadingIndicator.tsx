export function LoadingIndicator({ label }: { label: string }) {
  return <div role="status" className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:bg-canvas tw:p-5 tw:text-sm tw:text-ink">
    <span aria-hidden="true" className="tw:size-5 tw:shrink-0 tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand tw:motion-safe:animate-spin" />
    <span>{label}</span>
  </div>;
}
