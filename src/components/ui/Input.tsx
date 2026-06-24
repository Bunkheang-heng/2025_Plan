import React from 'react'

const baseInput = 'w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-150'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  helperText?: string
}

const Input: React.FC<InputProps> = ({ label, error, icon, helperText, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</div>}
      <input className={`${baseInput} ${icon ? 'pl-9' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`} {...props} />
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
  </div>
)

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const TextArea: React.FC<TextAreaProps> = ({ label, error, helperText, className = '', rows = 4, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <textarea rows={rows} className={`${baseInput} resize-none ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`} {...props} />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {helperText && !error && <p className="text-xs text-stone-400">{helperText}</p>}
  </div>
)

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</label>}
    <select className={`${baseInput} ${error ? 'border-red-300' : ''} ${className}`} {...props}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)

export { Input, TextArea, Select }
