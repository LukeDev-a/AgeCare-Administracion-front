import { useId, useState, type InputHTMLAttributes } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'children'> & {
  label: string;
  className?: string;
};

export function PasswordField({ label, className = '', id, disabled, ...inputProps }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const action = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  return <div className={`${className} tw:grid tw:min-w-0 tw:gap-2`}>
    <label htmlFor={inputId} className="tw:text-sm tw:font-semibold">{label}</label>
    <div className="tw:relative tw:min-w-0">
      <input autoCapitalize="none" autoCorrect="off" spellCheck={false} {...inputProps} id={inputId} type={visible ? 'text' : 'password'} disabled={disabled}
        className="tw:min-h-12 tw:w-full tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-stroke tw:bg-canvas tw:py-3 tw:pr-14 tw:pl-3 tw:font-sans tw:text-base tw:font-normal tw:text-ink tw:focus-visible:outline-2 tw:focus-visible:outline-brand" />
      <button type="button" disabled={disabled} aria-label={`${action} (${label})`} title={action}
        aria-pressed={visible} aria-controls={inputId} onClick={() => setVisible(current => !current)}
        className="tw:absolute tw:top-1/2 tw:right-0.5 tw:flex tw:min-h-11 tw:min-w-11 tw:-translate-y-1/2 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-lg tw:border-0 tw:bg-transparent tw:text-muted tw:hover:text-brand-ink tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:focus-visible:outline-2 tw:focus-visible:outline-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  </div>;
}
