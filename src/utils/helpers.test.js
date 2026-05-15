import { describe, it, expect, vi } from 'vitest';
import { getInitials, getAvatarGradient, formatFileSize, extractError, formatRelativeTime, formatFullTime } from './helpers';

describe('helpers.js', () => {
  describe('getInitials', () => {
    it('returns initials for a full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns single initial for a single name', () => {
      expect(getInitials('Alice')).toBe('A');
    });

    it('returns "?" for empty input', () => {
      expect(getInitials('')).toBe('?');
    });
  });

  describe('getAvatarGradient', () => {
    it('returns a linear-gradient string', () => {
      const gradient = getAvatarGradient('testuser');
      expect(gradient).toContain('linear-gradient(135deg,');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats KB correctly', () => {
      expect(formatFileSize(1500)).toBe('1.5 KB');
    });

    it('formats MB correctly', () => {
      expect(formatFileSize(2000000)).toBe('1.9 MB');
    });
  });

  describe('extractError', () => {
    it('extracts message from axios error', () => {
      const error = { response: { data: { message: 'Invalid credentials' } } };
      expect(extractError(error)).toBe('Invalid credentials');
    });

    it('returns default message if no error data', () => {
      expect(extractError({})).toBe('Something went wrong');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Yesterday" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeTime(yesterday.toISOString())).toBe('Yesterday');
    });

    it('returns "dd MMM" for older dates', () => {
      const oldDate = new Date('2023-01-01T12:00:00');
      expect(formatRelativeTime(oldDate.toISOString())).toBe('01 Jan');
    });

    it('returns empty string for null input', () => {
      expect(formatRelativeTime(null)).toBe('');
    });
  });

  describe('formatFullTime', () => {
    it('formats a date string correctly', () => {
      const date = new Date('2024-05-09T14:30:00');
      expect(formatFullTime(date.toISOString())).toBe('09 May 2024, 14:30');
    });

    it('returns empty string for null input', () => {
      expect(formatFullTime(null)).toBe('');
    });
  });
});
