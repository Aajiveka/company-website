import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Pagination>;

function PaginationFew() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} pageCount={3} onChange={setPage} />;
}

function PaginationMany() {
  const [page, setPage] = useState(5);
  return <Pagination page={page} pageCount={20} onChange={setPage} />;
}

function PaginationFirst() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} pageCount={10} onChange={setPage} />;
}

function PaginationLast() {
  const [page, setPage] = useState(10);
  return <Pagination page={page} pageCount={10} onChange={setPage} />;
}

export const FewPages: Story = { render: () => <PaginationFew /> };
export const ManyPages: Story = { render: () => <PaginationMany /> };
export const FirstPage: Story = { render: () => <PaginationFirst /> };
export const LastPage: Story = { render: () => <PaginationLast /> };

export const SinglePage: Story = {
  args: {
    page: 1,
    pageCount: 1,
    onChange: () => {},
  },
};
