import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

/**
 * Radix DropdownMenu behind the same props.
 *
 * The hand-rolled version closed on click-outside but had no keyboard support at all —
 * arrow keys did nothing, Esc did nothing, focus never entered the menu. This is the
 * account menu, so Logout was effectively mouse-only. Radix gives roving focus, typeahead,
 * Esc, and the correct ARIA wiring.
 */
export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
        {trigger}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={align === 'right' ? 'end' : 'start'}
          sideOffset={8}
          className="z-50 min-w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {items.map((item, i) => (
            <Menu.Item
              key={i}
              onSelect={item.onSelect}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm outline-none',
                'data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-gray-700',
                item.danger ? 'text-danger' : 'text-gray-700 dark:text-gray-200',
              )}
            >
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
