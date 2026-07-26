import { ImageCropper } from './ImageCropper';

const meta = {
  title: 'UI/ImageCropper',
  component: ImageCropper,
  tags: ['autodocs'] as string[],
};
export default meta;

// A small placeholder image (1x1 blue PNG encoded as data URL) for demo purposes.
// In a real scenario this would be a photo URL.
const PLACEHOLDER_SRC =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
      '<rect width="400" height="300" fill="#4f8cff"/>' +
      '<text x="200" y="150" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="24">Sample Image</text>' +
      '</svg>',
  );

export const SquareCrop = {
  args: {
    src: PLACEHOLDER_SRC,
    aspect: 1,
    onCrop: (blob: Blob) => console.log('Cropped:', blob),
    onCancel: () => console.log('Cancelled'),
  },
};

export const LandscapeCrop = {
  args: {
    src: PLACEHOLDER_SRC,
    aspect: 16 / 9,
    onCrop: (blob: Blob) => console.log('Cropped:', blob),
    onCancel: () => console.log('Cancelled'),
  },
};

export const PortraitCrop = {
  args: {
    src: PLACEHOLDER_SRC,
    aspect: 3 / 4,
    onCrop: (blob: Blob) => console.log('Cropped:', blob),
    onCancel: () => console.log('Cancelled'),
  },
};
