import { useRef, useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN', 'DIV',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
};

function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function walk(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          // Replace disallowed element with its children
          while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
          el.parentNode?.removeChild(el);
          continue;
        }
        // Strip disallowed attributes
        const allowed = ALLOWED_ATTRS[el.tagName] ?? new Set<string>();
        for (const attr of Array.from(el.attributes)) {
          if (!allowed.has(attr.name)) el.removeAttribute(attr.name);
        }
        // Sanitize href to prevent javascript: urls
        if (el.tagName === 'A') {
          const href = el.getAttribute('href') ?? '';
          if (href.trim().toLowerCase().startsWith('javascript:')) {
            el.setAttribute('href', '#');
          }
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
        walk(el);
      } else {
        // Remove comments, processing instructions, etc.
        child.parentNode?.removeChild(child);
      }
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}

interface ToolbarButtonProps {
  command: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, label, isActive, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent stealing focus from contentEditable
        onClick();
      }}
      className={cn(
        'rounded p-1.5 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-gray-400 dark:hover:bg-gray-600',
        isActive && 'bg-gray-200 text-primary dark:bg-gray-600 dark:text-primary',
      )}
    >
      {icon}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = '150px',
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const isInternalChange = useRef(false);

  // Sync external value into the editor (only when the editor is not focused / value changed externally)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
    setActiveFormats(formats);
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(sanitize(el.innerHTML));
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  const handleLink = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  }, [exec]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Update active formats on key navigation
    setTimeout(updateActiveFormats, 0);
    // Prevent default tab behavior
    if (e.key === 'Tab') {
      e.preventDefault();
    }
  }, [updateActiveFormats]);

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>' || value.replace(/<[^>]*>/g, '').trim() === '';

  return (
    <div className={cn('rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden', className)}>
      {/* Toolbar */}
      <div role="toolbar" aria-label="Formatting options" className="flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700">
        <ToolbarButton
          command="bold"
          icon={<Bold className="h-4 w-4" />}
          label="Bold"
          isActive={activeFormats.has('bold')}
          onClick={() => exec('bold')}
        />
        <ToolbarButton
          command="italic"
          icon={<Italic className="h-4 w-4" />}
          label="Italic"
          isActive={activeFormats.has('italic')}
          onClick={() => exec('italic')}
        />
        <ToolbarButton
          command="underline"
          icon={<Underline className="h-4 w-4" />}
          label="Underline"
          isActive={activeFormats.has('underline')}
          onClick={() => exec('underline')}
        />
        <div className="mx-1 w-px bg-gray-300 dark:bg-gray-500" />
        <ToolbarButton
          command="insertUnorderedList"
          icon={<List className="h-4 w-4" />}
          label="Bullet list"
          isActive={activeFormats.has('insertUnorderedList')}
          onClick={() => exec('insertUnorderedList')}
        />
        <ToolbarButton
          command="insertOrderedList"
          icon={<ListOrdered className="h-4 w-4" />}
          label="Numbered list"
          isActive={activeFormats.has('insertOrderedList')}
          onClick={() => exec('insertOrderedList')}
        />
        <div className="mx-1 w-px bg-gray-300 dark:bg-gray-500" />
        <ToolbarButton
          command="createLink"
          icon={<LinkIcon className="h-4 w-4" />}
          label="Link"
          isActive={false}
          onClick={handleLink}
        />
      </div>

      {/* Editor area */}
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute left-3.5 top-2.5 text-sm text-gray-400 dark:text-gray-500">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline
          aria-label={placeholder}
          className="w-full bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-200"
          style={{ minHeight }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveFormats}
          onKeyUp={updateActiveFormats}
        />
      </div>
    </div>
  );
}
