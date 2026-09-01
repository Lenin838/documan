import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from './notification.controller.js';
import * as notificationService from './notification.service.js';

vi.mock('./notification.service.js', () => ({
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

describe('notification.controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: {
        userId: '6a96540c455c29cfb3c2e95f',
        role: 'user',
      },
    };

    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn() as unknown as NextFunction;
  });

  describe('getNotificationsController', () => {
    it('should return 401 if unauthenticated', async () => {
      delete req.user;

      await getNotificationsController(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );
    });

    it('should call getUserNotifications and send success response', async () => {
      res.locals!.validatedQuery = { page: 1, limit: 20 };
      const mockResult = { notifications: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockResult);

      await getNotificationsController(req as Request, res as Response, next);

      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        '6a96540c455c29cfb3c2e95f',
        'user',
        { page: 1, limit: 20 },
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('markNotificationAsReadController', () => {
    it('should mark notification as read for authenticated user', async () => {
      res.locals!.validatedParams = { id: '6a96540c455c29cfb3c2e911' };
      const mockResult = { id: '6a96540c455c29cfb3c2e911', isRead: true as const, readAt: new Date() };
      vi.mocked(notificationService.markNotificationAsRead).mockResolvedValue(mockResult);

      await markNotificationAsReadController(req as Request, res as Response, next);

      expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith(
        '6a96540c455c29cfb3c2e95f',
        '6a96540c455c29cfb3c2e911',
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('markAllNotificationsAsReadController', () => {
    it('should mark all notifications as read for authenticated user', async () => {
      const mockResult = { updatedCount: 3 };
      vi.mocked(notificationService.markAllNotificationsAsRead).mockResolvedValue(mockResult);

      await markAllNotificationsAsReadController(req as Request, res as Response, next);

      expect(notificationService.markAllNotificationsAsRead).toHaveBeenCalledWith(
        '6a96540c455c29cfb3c2e95f',
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });
});
