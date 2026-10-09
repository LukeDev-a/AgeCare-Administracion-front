import type { SettingValue, ValueSchema } from '../../api/settings';
import { fieldName, fieldHelp, rules, displayValue } from '../../lib/settingsMeta';

function ScalarField({ name, value, schema, disabled, onChange }: {
  name: string; value: SettingValue; schema: ValueSchema; disabled: boolean; onChange: (value: SettingValue) => void;
}) {
  const label = fieldName(name, schema);
  const hints = rules(schema);
  return <label className="settings-field"><span>{label}</span>
    {schema.enum ? <select aria-label={label} disabled={disabled} value={JSON.stringify(value)}
      onChange={event => onChange(JSON.parse(event.target.value))}>
      {schema.enum.map((option, index) => <option key={index} value={JSON.stringify(option)}>{displayValue(option, schema)}</option>)}
    </select> : typeof value === 'boolean' ? <select aria-label={label} value={String(value)} disabled={disabled}
      onChange={event => onChange(event.target.value === 'true')}><option value="true">Sí</option><option value="false">No</option></select>
      : typeof value === 'number' ? <input aria-label={label} type="number" required disabled={disabled} defaultValue={value}
        step={schema.type === 'integer' ? '1' : 'any'} min={schema.minimum} max={schema.maximum}
        onChange={event => { if (event.target.value !== '') onChange(Number(event.target.value)); }} />
        : <textarea aria-label={label} value={String(value ?? '')} disabled={disabled} rows={3}
          minLength={schema.minLength} maxLength={schema.maxLength} onChange={event => onChange(event.target.value)} />}
    {(fieldHelp(name) || schema.description) && <small>{fieldHelp(name) || schema.description}</small>}
    {hints.length > 0 && <small>{hints.join(' · ')}</small>}
  </label>;
}
export function SettingValueFields({ value, schema, disabled, onChange }: {
  value: SettingValue; schema: ValueSchema; disabled: boolean; onChange: (value: SettingValue) => void;
}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return <div className="settings-fields">{Object.entries(value).map(([key, field]) =>
      <ScalarField key={key} name={key} value={field} schema={schema.properties?.[key] ?? {}}
        disabled={disabled} onChange={next => onChange({ ...value, [key]: next })} />)}</div>;
  }
  return <ScalarField name="Valor" value={value} schema={schema} disabled={disabled} onChange={onChange} />;
}
