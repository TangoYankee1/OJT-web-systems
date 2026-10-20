import { useId } from 'react';
export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  options = [],
  required = false,
  error,
  help,
  ...props
}) {
  const id = useId();
  return (
    <label className={'field ' + (type === 'checkbox' ? 'checkbox-field' : '')} htmlFor={id}>
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {type === 'select' ? (
        <select
          id={id}
          aria-label={label}
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-invalid={!!error}
          {...props}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          aria-label={label}
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-invalid={!!error}
          {...props}
        />
      ) : (
        <input
          id={id}
          aria-label={label}
          name={name}
          type={type}
          value={type === 'checkbox' ? undefined : (value ?? '')}
          checked={type === 'checkbox' ? Boolean(value) : undefined}
          onChange={(e) => onChange(type === 'checkbox' ? e.target.checked : e.target.value)}
          required={required}
          aria-invalid={!!error}
          {...props}
        />
      )}{' '}
      {help && <small>{help}</small>}
      {error && (
        <small className="error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
