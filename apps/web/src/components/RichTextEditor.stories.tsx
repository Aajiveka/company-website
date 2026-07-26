import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import RichTextEditor from './RichTextEditor';

const meta: Meta<typeof RichTextEditor> = {
  title: 'Components/RichTextEditor',
  component: RichTextEditor,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof RichTextEditor>;

function EditorDefault() {
  const [value, setValue] = useState('');
  return <RichTextEditor value={value} onChange={setValue} />;
}

function EditorWithPlaceholder() {
  const [value, setValue] = useState('');
  return <RichTextEditor value={value} onChange={setValue} placeholder="Write a job description..." />;
}

function EditorWithContent() {
  const [value, setValue] = useState(
    '<p>This is <strong>bold</strong> and <em>italic</em> text.</p><ul><li>Item one</li><li>Item two</li></ul>',
  );
  return <RichTextEditor value={value} onChange={setValue} />;
}

function EditorTall() {
  const [value, setValue] = useState('');
  return <RichTextEditor value={value} onChange={setValue} minHeight="300px" placeholder="Tall editor..." />;
}

export const Default: Story = { render: () => <EditorDefault /> };
export const WithPlaceholder: Story = { render: () => <EditorWithPlaceholder /> };
export const WithInitialContent: Story = { render: () => <EditorWithContent /> };
export const CustomMinHeight: Story = { render: () => <EditorTall /> };
