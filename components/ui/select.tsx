'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const SelectContext = React.createContext<SelectContextValue>({
  value: '',
  onValueChange: () => {},
});

export function Select({
  value = '',
  onValueChange = () => {},
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}) {
  // Collect SelectItem options from children tree so we can render a reliable native select
  const items: { value: string; label: React.ReactNode }[] = [];
  let placeholder = 'Selecione...';
  let triggerClassName = '';

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const childProps = child.props as Record<string, any>;
    if (child.type === SelectTrigger) {
      triggerClassName = childProps.className ?? '';
      React.Children.forEach(childProps.children, (tChild) => {
        if (React.isValidElement(tChild) && tChild.type === SelectValue) {
          placeholder = (tChild.props as any).placeholder ?? placeholder;
        }
      });
    } else if (child.type === SelectContent) {
      React.Children.forEach(childProps.children, (cChild) => {
        if (React.isValidElement(cChild) && cChild.type === SelectItem) {
          const itemProps = cChild.props as any;
          items.push({ value: itemProps.value, label: itemProps.children });
        }
      });
    }
  });

  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'flex h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          triggerClassName
        )}
      >
        {!items.some((i) => i.value === '') && <option value="">{placeholder}</option>}
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <>{placeholder}</>;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

