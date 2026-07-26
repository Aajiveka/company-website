import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

describe('useDragAndDrop', () => {
  const mockOnReorder = vi.fn();

  const createDragEvent = () =>
    ({ preventDefault: vi.fn() }) as unknown as React.DragEvent;

  function setup() {
    return renderHook(() =>
      useDragAndDrop({
        columns: { todo: [{ id: '1' }, { id: '2' }], done: [{ id: '3' }] },
        onReorder: mockOnReorder,
      }),
    );
  }

  it('returns all handler functions', () => {
    const { result } = setup();
    expect(typeof result.current.handleDragStart).toBe('function');
    expect(typeof result.current.handleDragOver).toBe('function');
    expect(typeof result.current.handleDrop).toBe('function');
    expect(typeof result.current.handleDragEnd).toBe('function');
  });

  it('dragOverColumn is initially null', () => {
    const { result } = setup();
    expect(result.current.dragOverColumn).toBeNull();
  });

  it('handleDragOver sets dragOverColumn', () => {
    const { result } = setup();
    const event = createDragEvent();

    act(() => {
      result.current.handleDragOver(event, 'done');
    });

    expect(result.current.dragOverColumn).toBe('done');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handleDrop calls onReorder with correct arguments', () => {
    const { result } = setup();
    const event = createDragEvent();

    act(() => {
      result.current.handleDragStart('1', 'todo', 0);
    });

    act(() => {
      result.current.handleDrop(event, 'done', 1);
    });

    expect(mockOnReorder).toHaveBeenCalledWith('1', 'todo', 'done', 1);
  });

  it('handleDrop does nothing when no drag has started', () => {
    mockOnReorder.mockClear();
    const { result } = setup();
    const event = createDragEvent();

    act(() => {
      result.current.handleDrop(event, 'done', 0);
    });

    expect(mockOnReorder).not.toHaveBeenCalled();
  });

  it('handleDragEnd resets dragOverColumn', () => {
    const { result } = setup();
    const event = createDragEvent();

    act(() => {
      result.current.handleDragOver(event, 'todo');
    });
    expect(result.current.dragOverColumn).toBe('todo');

    act(() => {
      result.current.handleDragEnd();
    });
    expect(result.current.dragOverColumn).toBeNull();
  });

  it('handleDrop resets state after drop', () => {
    const { result } = setup();
    const event = createDragEvent();

    act(() => {
      result.current.handleDragStart('1', 'todo', 0);
      result.current.handleDragOver(event, 'done');
    });

    act(() => {
      result.current.handleDrop(event, 'done', 0);
    });

    expect(result.current.dragOverColumn).toBeNull();
  });
});
