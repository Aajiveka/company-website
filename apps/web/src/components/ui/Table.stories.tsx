import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './Table';
import type { Column } from './Table';
import { Badge } from './Badge';
import { Pagination } from './Pagination';
import { useState } from 'react';

interface Employee {
  id: number;
  name: string;
  role: string;
  status: string;
}

const sampleData: Employee[] = [
  { id: 1, name: 'Rahul Sharma', role: 'Software Engineer', status: 'Active' },
  { id: 2, name: 'Priya Patel', role: 'Product Manager', status: 'Active' },
  { id: 3, name: 'Amit Kumar', role: 'Designer', status: 'Closed' },
  { id: 4, name: 'Sneha Gupta', role: 'Data Analyst', status: 'Active' },
  { id: 5, name: 'Vikram Singh', role: 'DevOps Engineer', status: 'Pending' },
];

const columns: Column<Employee>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge tone={row.status === 'Active' ? 'green' : row.status === 'Pending' ? 'amber' : 'gray'}>
        {row.status}
      </Badge>
    ),
  },
];

const meta: Meta<typeof Table<Employee>> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Table<Employee>>;

export const WithData: Story = {
  args: {
    columns,
    data: sampleData,
    rowKey: (row: Employee) => row.id,
  },
};

export const Loading: Story = {
  args: {
    columns,
    data: [],
    rowKey: (row: Employee) => row.id,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    rowKey: (row: Employee) => row.id,
    emptyMessage: 'No employees found.',
  },
};

function TableWithPagination() {
  const allData = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    role: ['Engineer', 'Designer', 'Manager', 'Analyst'][i % 4],
    status: ['Active', 'Pending', 'Closed'][i % 3],
  }));
  const [page, setPage] = useState(1);
  const perPage = 5;
  const pageData = allData.slice((page - 1) * perPage, page * perPage);
  return (
    <div className="space-y-4">
      <Table columns={columns} data={pageData} rowKey={(row) => row.id} />
      <div className="flex justify-end">
        <Pagination page={page} pageCount={Math.ceil(allData.length / perPage)} onChange={setPage} />
      </div>
    </div>
  );
}

export const WithPagination: Story = {
  render: () => <TableWithPagination />,
};
