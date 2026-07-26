import { useState } from 'react';
import { RangeSlider } from './RangeSlider';

const meta = {
  title: 'UI/RangeSlider',
  component: RangeSlider,
  tags: ['autodocs'] as string[],
};
export default meta;

export const Default = {
  args: {
    min: 0,
    max: 100,
    value: [20, 80] as [number, number],
    onChange: (v: [number, number]) => console.log('Changed:', v),
    label: 'Price Range',
  },
};

export const SalaryRange = {
  args: {
    min: 0,
    max: 5000000,
    value: [300000, 2000000] as [number, number],
    step: 50000,
    onChange: (v: [number, number]) => console.log('Changed:', v),
    label: 'Annual CTC (INR)',
    formatValue: (v: number) =>
      v >= 100000 ? `${(v / 100000).toFixed(1)} L` : `${v}`,
  },
};

function InteractiveDemo() {
  const [value, setValue] = useState<[number, number]>([2, 8]);
  return (
    <div className="max-w-md">
      <RangeSlider
        min={0}
        max={15}
        value={value}
        onChange={setValue}
        step={1}
        label="Experience (years)"
        formatValue={(v) => `${v} yr`}
      />
      <p className="mt-4 text-sm text-gray-500">
        Selected: {value[0]} - {value[1]} years
      </p>
    </div>
  );
}

export const Interactive = {
  render: () => <InteractiveDemo />,
};
