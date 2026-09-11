import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import type { SearchOption } from './useOptionSearch';

export interface ParsedOptions {
  options: SearchOption[];
  /** Label of the `value=""` row, which callers write as their "Select…" placeholder. */
  placeholder?: string;
  /** Whether a `value=""` row existed — i.e. whether clearing the field is allowed. */
  clearable: boolean;
}

/** Flatten an <option>'s children down to its visible text. */
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('')
    .trim();
}

/**
 * Read `<option>` / `<optgroup>` JSX into the flat option list the searchable dropdown wants.
 *
 * The wizard's `Select` takes children rather than an `options` array, so this is what lets
 * all of its call sites gain search without being rewritten. `<optgroup>` labels survive as
 * section headings — the Education step relies on them to group its 91 qualifications.
 */
export function optionsFromChildren(children: ReactNode): ParsedOptions {
  const options: SearchOption[] = [];
  let placeholder: string | undefined;
  let clearable = false;

  const walk = (nodes: ReactNode, group?: string) => {
    for (const child of Children.toArray(nodes)) {
      if (!isValidElement(child)) continue;

      // `Children.toArray` flattens arrays but not fragments — walk through those ourselves.
      if (child.type === Fragment) {
        walk((child.props as { children?: ReactNode }).children, group);
        continue;
      }

      if (child.type === 'optgroup') {
        const props = child.props as { label?: string; children?: ReactNode };
        walk(props.children, props.label);
        continue;
      }

      if (child.type === 'option') {
        const props = child.props as {
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        };
        const label = text(props.children);
        const value = props.value == null ? label : String(props.value);

        // A blank-valued row is the placeholder, not something to scroll past.
        if (value === '') {
          clearable = true;
          placeholder ??= label || undefined;
          continue;
        }

        options.push({ value, label, disabled: props.disabled, group });
      }
    }
  };

  walk(children);
  return { options, placeholder, clearable };
}
