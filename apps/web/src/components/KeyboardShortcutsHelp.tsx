import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const modifier = isMac ? '\u2318' : 'Ctrl';

interface ShortcutEntry {
  keys: string;
  description: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: `${modifier}+K`, description: 'Search jobs' },
  { keys: '/', description: 'Focus search' },
  { keys: 'Escape', description: 'Close modal/drawer' },
  { keys: '?', description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: '?',
      shift: true,
      handler: () => setOpen((prev) => !prev),
      description: 'Show keyboard shortcuts',
    },
  ]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard Shortcuts">
      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className="contents">
            <kbd className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
              {shortcut.keys}
            </kbd>
            <span className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              {shortcut.description}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
