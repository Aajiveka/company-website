import { describe, expect, it } from 'vitest';
import { composeMarks, formatMarks, parseMarks } from '../format';

describe('education scores', () => {
  it('reads a bare number as a percentage, which is what the field used to ask for', () => {
    expect(parseMarks('80')).toEqual({ scale: 'percent', value: '80' });
    expect(parseMarks('78.5 %')).toEqual({ scale: 'percent', value: '78.5' });
  });

  it('reads every CGPA form the column already holds', () => {
    expect(parseMarks('8.5 CGPA')).toEqual({ scale: 'cgpa10', value: '8.5' });
    expect(parseMarks('8.5/10')).toEqual({ scale: 'cgpa10', value: '8.5' });
    expect(parseMarks('9 gpa')).toEqual({ scale: 'cgpa10', value: '9' });
    expect(parseMarks('3.6 / 4')).toEqual({ scale: 'cgpa4', value: '3.6' });
  });

  it('keeps anything else as typed', () => {
    expect(parseMarks('4/5')).toEqual({ scale: 'percent', value: '4/5' });
    expect(composeMarks('percent', '4/5')).toBe('4/5');
  });

  it('stores the scale with the number', () => {
    expect(composeMarks('percent', '80')).toBe('80%');
    expect(composeMarks('cgpa10', ' 8.5 ')).toBe('8.5/10');
    expect(composeMarks('cgpa4', '3.6')).toBe('3.6/4');
    expect(composeMarks('cgpa10', '')).toBe('');
  });

  it('prints what the number is, not a bare "Score"', () => {
    expect(formatMarks('80')).toBe('Percentage: 80%');
    expect(formatMarks('8.5 CGPA')).toBe('CGPA: 8.5/10');
    expect(formatMarks('3.6/4')).toBe('CGPA: 3.6/4');
    expect(formatMarks('First class')).toBe('Score: First class');
    expect(formatMarks('')).toBe('');
    expect(formatMarks(null)).toBe('');
  });
});
