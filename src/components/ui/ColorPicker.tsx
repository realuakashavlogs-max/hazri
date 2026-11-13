import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export const DEFAULT_COLOR_SWATCHES = [
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Emerald Green', hex: '#16A34A' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Violet Purple', hex: '#7C3AED' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Deep Navy', hex: '#1E3A8A' },
];

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  swatches?: { name: string; hex: string }[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  swatches = DEFAULT_COLOR_SWATCHES,
}) => {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      onChange(cleaned.toUpperCase());
    }
  };

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-xs font-semibold text-[var(--color-text)]">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2.5 flex-wrap">
        {swatches.map((swatch) => {
          const isSelected = value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.hex}
              type="button"
              disabled={disabled}
              onClick={() => onChange(swatch.hex)}
              title={swatch.name}
              aria-label={`Select ${swatch.name} (${swatch.hex})`}
              aria-pressed={isSelected}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform duration-150 ${
                isSelected
                  ? 'ring-4 ring-offset-2 ring-primary/40 scale-105'
                  : 'hover:scale-105'
              } disabled:opacity-50`}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && <Check className="w-4 h-4" />}
            </button>
          );
        })}

        {/* Native color input + Hex text input */}
        <div className="flex items-center gap-2 px-2.5 min-h-[44px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#2563EB'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            disabled={disabled}
            aria-label="Custom color picker"
            className="w-7 h-7 rounded-md cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            disabled={disabled}
            placeholder="#2563EB"
            maxLength={7}
            aria-label="Hex color code"
            className="w-20 bg-transparent text-xs font-mono font-semibold text-[var(--color-text)] focus:outline-none uppercase"
          />
        </div>
      </div>
    </div>
  );
};
