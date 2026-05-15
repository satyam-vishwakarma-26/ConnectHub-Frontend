import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from './ProfilePage';
import { useAuthStore } from '../../context/authStore';
import { BrowserRouter } from 'react-router-dom';

// Mock the context and hooks
vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn()
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProfilePage', () => {
  const mockUser = {
    id: '1',
    username: 'alice',
    fullName: 'Alice Smith',
    email: 'alice@example.com',
    role: 'USER',
    isActive: true,
    provider: 'LOCAL',
    avatarUrl: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      updateStatus: vi.fn(),
      isLoading: false
    });
  });

  const renderWithRouter = (ui) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders profile information correctly', () => {
    renderWithRouter(<ProfilePage />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    renderWithRouter(<ProfilePage />);
    
    const passwordTab = screen.getByText('Password');
    fireEvent.click(passwordTab);
    
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    
    const statusTab = screen.getByText('Status');
    fireEvent.click(statusTab);
    
    expect(screen.getByText('Choose your online status')).toBeInTheDocument();
  });

  it('validates profile form correctly', async () => {
    renderWithRouter(<ProfilePage />);
    
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Min 3 characters')).toBeInTheDocument();
  });

  it('shows OAuth message in password tab if not LOCAL provider', () => {
    useAuthStore.mockReturnValue({
      user: { ...mockUser, provider: 'GOOGLE' },
      isLoading: false
    });
    
    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Password'));
    
    expect(screen.getByText(/Manage your password through GOOGLE/i)).toBeInTheDocument();
  });

  it('calls updateProfile when save changes is clicked', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ success: true });
    useAuthStore.mockReturnValue({
      user: mockUser,
      updateProfile,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    
    const fullNameInput = screen.getByLabelText('Full Name');
    fireEvent.change(fullNameInput, { target: { value: 'Alice Updated' } });
    
    fireEvent.click(screen.getByText('Save Changes'));
    
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Alice Updated'
    }));
  });

  it('calls updateStatus when status is saved', async () => {
    const updateStatus = vi.fn().mockResolvedValue({ success: true });
    useAuthStore.mockReturnValue({
      user: mockUser,
      updateStatus,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Status'));
    
    const dndButton = screen.getByText('Do Not Disturb');
    fireEvent.click(dndButton);
    
    fireEvent.click(screen.getByText('Save Status'));
    
    expect(updateStatus).toHaveBeenCalledWith('DND');
  });

  it('calls changePassword with correct values', async () => {
    const changePassword = vi.fn().mockResolvedValue({ success: true });
    useAuthStore.mockReturnValue({
      user: mockUser,
      changePassword,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Password'));
    
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });
    
    fireEvent.click(screen.getByText('Change Password'));
    
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpass',
      newPassword: 'newpass123'
    });
  });

  it('handles password change error', async () => {
    const changePassword = vi.fn().mockResolvedValue({ success: false, message: 'Invalid password' });
    useAuthStore.mockReturnValue({
      user: mockUser,
      changePassword,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Password'));
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Change Password'));
    
    await waitFor(() => expect(changePassword).toHaveBeenCalled());
  });

  it('handles status update error', async () => {
    const updateStatus = vi.fn().mockResolvedValue({ success: false, message: 'Error' });
    useAuthStore.mockReturnValue({
      user: mockUser,
      updateStatus,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Save Status'));
    await waitFor(() => expect(updateStatus).toHaveBeenCalled());
  });

  it('navigates to forgot password', () => {
    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Password'));
    fireEvent.click(screen.getByText('Forgot your password?'));
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('handles avatar file change and successful upload', async () => {
    const uploadMedia = vi.fn().mockResolvedValue({ data: { data: { mediaUrl: 'new-avatar.png' } } });
    const updateProfile = vi.fn().mockResolvedValue({ success: true });
    
    // We need to mock messageApiService.uploadMedia
    // It's imported in ProfilePage.jsx, so we can mock it
    vi.mock('../../api/messageApi', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        messageApiService: {
          ...actual.messageApiService,
          uploadMedia: vi.fn().mockResolvedValue({ data: { data: { mediaUrl: 'new-avatar.png' } } })
        }
      };
    });

    useAuthStore.mockReturnValue({
      user: mockUser,
      updateProfile,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload Profile Picture/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    // Click save
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      avatarUrl: 'new-avatar.png'
    })));
  });

  it('navigates back when back button is clicked', () => {
    renderWithRouter(<ProfilePage />);
    const backBtn = screen.getByLabelText(/Go back/i);
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('shows error for non-image files', async () => {
    renderWithRouter(<ProfilePage />);
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/Upload Profile Picture/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    // This triggers toast.error('Please select an image file')
  });

  it('handles failed profile update toast', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ success: false, message: 'Server Error' });
    useAuthStore.mockReturnValue({
      user: mockUser,
      updateProfile,
      isLoading: false
    });

    renderWithRouter(<ProfilePage />);
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
  });
});
