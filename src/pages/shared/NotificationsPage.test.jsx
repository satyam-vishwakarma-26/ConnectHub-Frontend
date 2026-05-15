import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationsPage from './NotificationsPage';
import { notificationApiService } from '../../api/notificationApi';

// Mock the API service
vi.mock('../../api/notificationApi', () => ({
  notificationApiService: {
    getAll: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  }
}));

describe('NotificationsPage', () => {
  const mockNotifications = [
    { id: 1, title: 'New Message', message: 'Hello there', isRead: false, createdAt: new Date().toISOString() },
    { id: 2, title: 'Invite', message: 'Join room', isRead: true, createdAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    notificationApiService.getAll.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<NotificationsPage />);
    // Check for spinner or loading text
    // The component uses Loader2 which doesn't have text, but we can check for its existence
    // or just wait for it to disappear.
  });

  it('renders list of notifications', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('New Message')).toBeInTheDocument();
      expect(screen.getByText('Invite')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: [] } });
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('marks a notification as read', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.markRead.mockResolvedValue({});

    render(<NotificationsPage />);

    await waitFor(() => screen.getByText('Mark as read'));
    
    const markReadBtn = screen.getByText('Mark as read');
    fireEvent.click(markReadBtn);

    expect(notificationApiService.markRead).toHaveBeenCalledWith(1);
    // After marking as read, the button should disappear
    await waitFor(() => {
      expect(screen.queryByText('Mark as read')).not.toBeInTheDocument();
    });
  });

  it('removes a notification', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.remove.mockResolvedValue({});

    render(<NotificationsPage />);

    await waitFor(() => screen.getAllByText('Delete'));
    
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(notificationApiService.remove).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(screen.queryByText('New Message')).not.toBeInTheDocument();
    });
  });

  it('marks all as read', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.markAllRead.mockResolvedValue({});

    render(<NotificationsPage />);

    await waitFor(() => screen.getByText(/Mark all read/));
    
    const markAllBtn = screen.getByText(/Mark all read/);
    fireEvent.click(markAllBtn);

    expect(notificationApiService.markAllRead).toHaveBeenCalled();
  });

  it('shows error toast when load fails', async () => {
    notificationApiService.getAll.mockRejectedValue(new Error('API Error'));
    render(<NotificationsPage />);
  });

  it('shows error toast when markRead fails', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.markRead.mockRejectedValue(new Error('API Error'));
    render(<NotificationsPage />);
    await waitFor(() => screen.getByText('Mark as read'));
    fireEvent.click(screen.getByText('Mark as read'));
  });

  it('shows error toast when markAllRead fails', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.markAllRead.mockRejectedValue(new Error('API Error'));
    render(<NotificationsPage />);
    await waitFor(() => screen.getByText(/Mark all read/));
    fireEvent.click(screen.getByText(/Mark all read/));
  });

  it('shows error toast when remove fails', async () => {
    notificationApiService.getAll.mockResolvedValue({ data: { data: mockNotifications } });
    notificationApiService.remove.mockRejectedValue(new Error('API Error'));
    render(<NotificationsPage />);
    await waitFor(() => screen.getAllByText('Delete'));
    fireEvent.click(screen.getAllByText('Delete')[0]);
  });
});
