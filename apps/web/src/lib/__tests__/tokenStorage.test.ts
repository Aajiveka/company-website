import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear();
    localStorage.clear();
  });

  describe('access token (in-memory)', () => {
    it('returns null initially', () => {
      expect(tokenStorage.getAccess()).toBeNull();
    });

    it('stores and retrieves access token', () => {
      tokenStorage.setAccess('abc123');
      expect(tokenStorage.getAccess()).toBe('abc123');
    });

    it('clears access token when set to null', () => {
      tokenStorage.setAccess('abc123');
      tokenStorage.setAccess(null);
      expect(tokenStorage.getAccess()).toBeNull();
    });

    it('is NOT persisted in localStorage', () => {
      tokenStorage.setAccess('secret');
      expect(localStorage.getItem('aaj.refresh')).toBeNull();
    });
  });

  describe('refresh token (localStorage)', () => {
    it('returns null initially', () => {
      expect(tokenStorage.getRefresh()).toBeNull();
    });

    it('stores refresh token in localStorage', () => {
      tokenStorage.setRefresh('refresh-xyz');
      expect(tokenStorage.getRefresh()).toBe('refresh-xyz');
      expect(localStorage.getItem('aaj.refresh')).toBe('refresh-xyz');
    });

    it('removes refresh token when set to null', () => {
      tokenStorage.setRefresh('refresh-xyz');
      tokenStorage.setRefresh(null);
      expect(tokenStorage.getRefresh()).toBeNull();
      expect(localStorage.getItem('aaj.refresh')).toBeNull();
    });
  });

  describe('clear', () => {
    it('clears both access and refresh tokens', () => {
      tokenStorage.setAccess('access-1');
      tokenStorage.setRefresh('refresh-1');

      tokenStorage.clear();

      expect(tokenStorage.getAccess()).toBeNull();
      expect(tokenStorage.getRefresh()).toBeNull();
    });
  });
});
