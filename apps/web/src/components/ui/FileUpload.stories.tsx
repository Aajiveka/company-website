import { FileUpload } from './FileUpload';

const meta = {
  title: 'UI/FileUpload',
  component: FileUpload,
  tags: ['autodocs'] as string[],
};
export default meta;

export const Default = {
  args: {
    label: 'Upload Resume',
    hint: 'PDF, DOC, or DOCX up to 5 MB',
    accept: '.pdf,.doc,.docx',
    maxSize: 5 * 1024 * 1024,
    onUpload: (files: File[]) => console.log('Uploaded:', files),
  },
};

export const ImageUpload = {
  args: {
    label: 'Profile Photo',
    hint: 'JPG or PNG, max 2 MB',
    accept: 'image/*',
    maxSize: 2 * 1024 * 1024,
    onUpload: (files: File[]) => console.log('Uploaded:', files),
  },
};

export const MultipleFiles = {
  args: {
    label: 'Supporting Documents',
    hint: 'Upload up to 5 files',
    multiple: true,
    accept: '.pdf,.jpg,.png',
    maxSize: 10 * 1024 * 1024,
    onUpload: (files: File[]) => console.log('Uploaded:', files),
  },
};

export const Uploading = {
  args: {
    label: 'Upload Resume',
    accept: '.pdf',
    isUploading: true,
    progress: 45,
    onUpload: (files: File[]) => console.log('Uploaded:', files),
  },
};

export const WithError = {
  args: {
    label: 'Upload Resume',
    accept: '.pdf',
    error: 'File size exceeds the 5 MB limit',
    onUpload: (files: File[]) => console.log('Uploaded:', files),
  },
};
