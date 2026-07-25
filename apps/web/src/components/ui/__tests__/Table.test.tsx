import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Table, type Column } from '../Table';

interface TestRow {
  id: number;
  name: string;
  email: string;
}

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
];

const sampleData: TestRow[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com' },
  { id: 2, name: 'Bob', email: 'bob@test.com' },
];

describe('Table', () => {
  it('renders column headers', () => {
    render(<Table columns={columns} data={sampleData} rowKey={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<Table columns={columns} data={sampleData} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('calls rowKey for each row', () => {
    const rowKey = vi.fn((r: TestRow) => r.id);
    render(<Table columns={columns} data={sampleData} rowKey={rowKey} />);
    expect(rowKey).toHaveBeenCalledTimes(sampleData.length);
    expect(rowKey).toHaveBeenCalledWith(sampleData[0]);
    expect(rowKey).toHaveBeenCalledWith(sampleData[1]);
  });

  it('shows empty message when data array is empty', () => {
    render(<Table columns={columns} data={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText('No records found.')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <Table columns={columns} data={[]} rowKey={(r) => r.id} emptyMessage="Nothing here" />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <Table columns={columns} data={[]} rowKey={(r) => r.id} isLoading />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    // 5 skeleton rows x 2 columns = 10 skeleton divs
    expect(skeletons.length).toBe(10);
  });

  it('uses custom render function for columns', () => {
    const columnsWithRender: Column<TestRow>[] = [
      { key: 'name', header: 'Name', render: (row) => `Mr. ${row.name}` },
      { key: 'email', header: 'Email' },
    ];
    render(<Table columns={columnsWithRender} data={sampleData} rowKey={(r) => r.id} />);
    expect(screen.getByText('Mr. Alice')).toBeInTheDocument();
  });
});
