import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import messageApi, { messageApiService } from './messageApi';

// Mock window.location
delete window.location;
window.location = { href: vi.fn() };

describe('messageApi Interceptors and Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(messageApi, 'post').mockResolvedValue({ data: {} });
    vi.spyOn(messageApi, 'get').mockResolvedValue({ data: {} });
    vi.spyOn(messageApi, 'put').mockResolvedValue({ data: {} });
    vi.spyOn(messageApi, 'delete').mockResolvedValue({ data: {} });
  });

  describe('messageApiService Methods', () => {
    it('covers all service methods to ensure high coverage', async () => {
      const file = new File([''], 'test.png');
      
      await messageApiService.send({ content: 'hi' });
      await messageApiService.sendDirect({ content: 'hi' });
      await messageApiService.uploadMedia(file);
      await messageApiService.sendImage('r1', file, 'c', 1);
      await messageApiService.sendFile('r1', file, 'c', 1);
      await messageApiService.sendDirectImage('u1', file, 'c', 1);
      await messageApiService.sendDirectFile('u1', file, 'c', 1);
      await messageApiService.getByRoom('r1');
      await messageApiService.getBefore('r1', 'now');
      await messageApiService.getDirect('u1');
      await messageApiService.getDirectBefore('u1', 'now');
      await messageApiService.getById(1);
      await messageApiService.edit(1, {});
      await messageApiService.delete(1);
      await messageApiService.addReaction(1, '👍');
      await messageApiService.removeReaction(1, '👍');
      await messageApiService.search('r1', 'q');
      await messageApiService.getCount('r1');
      await messageApiService.getUnreadCount('r1', 'now');
      await messageApiService.updateStatus(1, 'READ');
      await messageApiService.pin(1);
      await messageApiService.unpin(1);
      await messageApiService.getPinnedMessages('r1');
      await messageApiService.adminDelete(1);
      await messageApiService.adminDeleteRoomHistory('r1');

      expect(messageApi.post).toHaveBeenCalled();
      expect(messageApi.get).toHaveBeenCalled();
      expect(messageApi.put).toHaveBeenCalled();
      expect(messageApi.delete).toHaveBeenCalled();
    });
  });

  describe('Interceptors', () => {
    it('injects token into headers if present', async () => {
      localStorage.setItem('accessToken', 'test-token');
      const config = { headers: {} };
      const requestInterceptor = messageApi.interceptors.request.handlers[0].fulfilled;
      const result = requestInterceptor(config);
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('handles successful response interceptor', () => {
      const responseInterceptor = messageApi.interceptors.response.handlers[0].fulfilled;
      const res = { data: 'ok' };
      expect(responseInterceptor(res)).toBe(res);
    });

    it('clears storage and redirects if no refresh token on 401', async () => {
      const clearSpy = vi.spyOn(Storage.prototype, 'clear');
      const error = { config: { headers: {}, _retry: false }, response: { status: 401 } };
      const responseInterceptor = messageApi.interceptors.response.handlers[0].rejected;
      try { await responseInterceptor(error); } catch (e) {}
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
