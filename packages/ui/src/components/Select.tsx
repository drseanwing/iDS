import * as React from 'react';
import { cn } from '../utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
