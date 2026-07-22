import { describe, expect, it, beforeEach } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it('stores and retrieves access token in memory', () => {
    expect(tokenStorage.getAccess()).toBeNull();
    tokenStorage.setAccess('abc123');
    expect(tokenStorage.getAccess()).toBe('abc123');
  });

  it('stores and retrieves refresh token in localStorage', () => {
    expect(tokenStorage.getRefresh()).toBeNull();
    tokenStorage.setRefresh('refresh-xyz');
    expect(tokenStorage.getRefresh()).toBe('refresh-xyz');
    expect(localStorage.getItem('aaj.refresh')).toBe('refresh-xyz');
  });

  it('clears both tokens', () => {
    tokenStorage.setAccess('a');
    tokenStorage.setRefresh('r');
    tokenStorage.clear();
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
  });

  it('removes refresh token when set to null', () => {
    tokenStorage.setRefresh('r');
    tokenStorage.setRefresh(null);
    expect(tokenStorage.getRefresh()).toBeNull();
  });
});
