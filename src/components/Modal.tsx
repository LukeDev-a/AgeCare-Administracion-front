import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function Modal({ title, children, onClose, dirty = false, busy = false, error = '' }: {
  title: string; children: ReactNode; onClose: () => void; dirty?: boolean; busy?: boolean; error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function close() {
    if (busy) return;
    if (dirty) setConfirmClose(true);
    else onClose();
  }

  return <dialog ref={ref} aria-labelledby={titleId}
    onCancel={event => event.preventDefault()}
    className="tw:m-auto tw:max-h-[92dvh] tw:w-[calc(100%-2rem)] tw:max-w-6xl tw:overflow-y-auto tw:rounded-2xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:p-0 tw:text-base tw:leading-relaxed tw:text-ink tw:shadow-xl tw:backdrop:bg-black/60">
    <header className="tw:sticky tw:top-0 tw:z-10 tw:space-y-4 tw:border-b tw:border-solid tw:border-stroke tw:bg-panel tw:p-5">
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-4">
        <h2 id={titleId} className="tw:text-xl tw:font-bold">{title}</h2>
        <button type="button" autoFocus disabled={busy} className={button} onClick={close}>Cerrar</button>
      </div>
      {busy && <p role="status" className="tw:flex tw:items-center tw:gap-3 tw:text-sm tw:text-muted"><span aria-hidden="true" className="tw:size-4 tw:animate-spin tw:rounded-full tw:border-2 tw:border-solid tw:border-stroke tw:border-t-brand" />Procesando solicitud…</p>}
      {error && <p role="alert" className="tw:rounded-xl tw:bg-warning-bg tw:p-4">{error}</p>}
      {confirmClose && <div className="tw:space-y-3 tw:rounded-xl tw:bg-warning-bg tw:p-4">
        <p role="alert">Tienes cambios sin guardar. ¿Quieres descartarlos y cerrar?</p>
        <div className="tw:flex tw:flex-wrap tw:gap-3">
          <button type="button" className={button} disabled={busy} onClick={() => setConfirmClose(false)}>Volver a editar</button>
          <button type="button" className={`${button} tw:text-negative`} disabled={busy} onClick={onClose}>Descartar y cerrar</button>
        </div>
      </div>}
    </header>
    <div inert={confirmClose} className="tw:p-3 tw:sm:p-5">{children}</div>
  </dialog>;
}

const button = 'tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-solid tw:border-stroke tw:bg-panel tw:px-4 tw:py-2 tw:font-semibold tw:text-ink tw:hover:bg-canvas tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-brand';
