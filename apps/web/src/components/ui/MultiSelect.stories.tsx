import { useState } from 'react';
import { MultiSelect } from './MultiSelect';

const meta = {
  title: 'UI/MultiSelect',
  component: MultiSelect,
  tags: ['autodocs'] as string[],
};
export default meta;

const SKILL_OPTIONS = [
  { label: 'JavaScript', value: 'js' },
  { label: 'TypeScript', value: 'ts' },
  { label: 'React', value: 'react' },
  { label: 'Node.js', value: 'node' },
  { label: 'Python', value: 'python' },
  { label: 'SQL', value: 'sql' },
  { label: 'Docker', value: 'docker' },
  { label: 'AWS', value: 'aws' },
];

export const Default = {
  args: {
    options: SKILL_OPTIONS,
    value: [],
    onChange: (v: string[]) => console.log('Changed:', v),
    placeholder: 'Select skills...',
    label: 'Skills',
  },
};

export const WithPreselected = {
  args: {
    options: SKILL_OPTIONS,
    value: ['ts', 'react', 'node'],
    onChange: (v: string[]) => console.log('Changed:', v),
    label: 'Skills',
  },
};

export const WithError = {
  args: {
    options: SKILL_OPTIONS,
    value: [],
    onChange: (v: string[]) => console.log('Changed:', v),
    label: 'Required Skills',
    error: 'Please select at least one skill',
  },
};

function InteractiveDemo() {
  const [selected, setSelected] = useState<string[]>(['react']);
  return (
    <div className="max-w-sm">
      <MultiSelect
        options={SKILL_OPTIONS}
        value={selected}
        onChange={setSelected}
        label="Pick your skills"
        placeholder="Search and select..."
      />
      <p className="mt-3 text-sm text-gray-500">
        Selected: {selected.length === 0 ? 'none' : selected.join(', ')}
      </p>
    </div>
  );
}

export const Interactive = {
  render: () => <InteractiveDemo />,
};
