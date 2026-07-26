import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Pagination,
  Table,
  useToast,
} from '@/components/ui';
import type { BadgeTone, Column } from '@/components/ui';

interface SampleRow {
  id: number;
  name: string;
  role: string;
  status: string;
}

const sampleData: SampleRow[] = [
  { id: 1, name: 'Alice', role: 'Engineer', status: 'Active' },
  { id: 2, name: 'Bob', role: 'Designer', status: 'Inactive' },
  { id: 3, name: 'Charlie', role: 'PM', status: 'Active' },
];

const columns: Column<SampleRow>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status' },
];

const badgeTones: BadgeTone[] = ['gray', 'blue', 'green', 'amber', 'red', 'purple'];

export default function ComponentShowcase() {
  const { notify } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-6">
      <h1 className="text-3xl font-bold text-navy dark:text-gray-100">
        Component Showcase
      </h1>

      {/* ── Buttons ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Button
        </h2>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Variants
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="accent">Accent</Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Sizes
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            States
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button isLoading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </section>

      {/* ── Badge ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Badge
        </h2>
        <div className="flex flex-wrap gap-3">
          {badgeTones.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </section>

      {/* ── Card ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Card
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is a sample card with header and body content.
          </p>
        </Card>
      </section>

      {/* ── Input ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Input
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Default" placeholder="Type something..." />
          <Input label="Required" placeholder="Required field" required />
          <Input label="With Error" placeholder="Invalid" error="This field is required." />
          <Input label="Disabled" placeholder="Disabled" disabled />
        </div>
      </section>

      {/* ── Alert ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Alert
        </h2>
        <div className="space-y-3">
          <Alert variant="info">This is an info alert.</Alert>
          <Alert variant="success">This is a success alert.</Alert>
          <Alert variant="warning">This is a warning alert.</Alert>
          <Alert variant="error">This is an error alert.</Alert>
        </div>
      </section>

      {/* ── Modal ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Modal
        </h2>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Sample Modal"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is a sample modal dialog with a title and close button.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </section>

      {/* ── Table ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Table
        </h2>
        <Table
          columns={columns}
          data={sampleData}
          rowKey={(row) => row.id}
        />
      </section>

      {/* ── Pagination ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Pagination
        </h2>
        <Pagination page={page} pageCount={10} onChange={setPage} />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Current page: {page}
        </p>
      </section>

      {/* ── Toast ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-navy dark:text-gray-200">
          Toast
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => notify('Success toast!', 'success')}
          >
            Success Toast
          </Button>
          <Button
            variant="danger"
            onClick={() => notify('Error toast!', 'error')}
          >
            Error Toast
          </Button>
          <Button
            variant="outline"
            onClick={() => notify('Info toast!', 'info')}
          >
            Info Toast
          </Button>
        </div>
      </section>
    </div>
  );
}
