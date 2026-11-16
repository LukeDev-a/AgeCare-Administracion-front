import type { SettingValue, ValueSchema } from '../../api/settings';
import { fieldName, fieldHelp, rules, displayValue } from '../../lib/settingsMeta';
import { settingsStyles as s } from './settingsStyles';

function booleanLabel(name: string, enabled: boolean) {
  if (name === 'notice_enabled') return enabled ? 'Publicado' : 'Oculto';
  if (name.endsWith('_enabled')) return enabled ? 'Activada' : 'Pausada';
  return enabled ? 'Sí' : 'No';
}

function ScalarField({ name, value, schema, disabled, onChange }: {
  name: string; value: SettingValue; schema: ValueSchema; disabled: boolean; onChange: (value: SettingValue) => void;
}) {
  const label = fieldName(name, schema);
  const hints = rules(schema).filter(hint => !hint.startsWith('Tipo:'));
  return <label className={`${s.label} ${name === 'notice_body' ? 'tw:sm:col-span-2' : ''}`}><span>{label}</span>
    {schema.enum ? <select className={s.field} aria-label={label} disabled={disabled} value={JSON.stringify(value)}
      onChange={event => onChange(JSON.parse(event.target.value))}>
      {schema.enum.map((option, index) => <option key={index} value={JSON.stringify(option)}>{displayValue(option, schema)}</option>)}
    </select> : typeof value === 'boolean' ? <select className={s.field} aria-label={label} value={String(value)} disabled={disabled}
      onChange={event => onChange(event.target.value === 'true')}><option value="true">{booleanLabel(name, true)}</option><option value="false">{booleanLabel(name, false)}</option></select>
      : typeof value === 'number' ? <input className={s.field} aria-label={label} type="number" required disabled={disabled} defaultValue={value}
        step={schema.type === 'integer' ? '1' : 'any'} min={schema.minimum} max={schema.maximum}
        onChange={event => { if (event.target.value !== '') onChange(Number(event.target.value)); }} />
        : name === 'notice_title' ? <input className={s.field} aria-label={label} value={String(value ?? '')} disabled={disabled}
          minLength={schema.minLength} maxLength={schema.maxLength} onChange={event => onChange(event.target.value)} />
        : <textarea className={`${s.field} tw:min-h-28`} aria-label={label} value={String(value ?? '')} disabled={disabled} rows={name === 'notice_body' ? 5 : 3}
          minLength={schema.minLength} maxLength={schema.maxLength} onChange={event => onChange(event.target.value)} />}
    {(fieldHelp(name) || schema.description) && <small className={s.muted}>{fieldHelp(name) || schema.description}</small>}
    {hints.length > 0 && !name.startsWith('notice_') && <small className={s.muted}>{hints.join(' · ')}</small>}
  </label>;
}
export function SettingValueFields({ value, schema, disabled, onChange }: {
  value: SettingValue; schema: ValueSchema; disabled: boolean; onChange: (value: SettingValue) => void;
}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return <div className="tw:grid tw:items-start tw:gap-5 tw:sm:grid-cols-2">{Object.entries(value).map(([key, field]) =>
      <ScalarField key={key} name={key} value={field} schema={schema.properties?.[key] ?? {}}
        disabled={disabled} onChange={next => onChange({ ...value, [key]: next })} />)}</div>;
  }
  return <ScalarField name="Valor" value={value} schema={schema} disabled={disabled} onChange={onChange} />;
}
