import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Avatar from './Avatar';

describe('Avatar Component', () => {
  const mockUser = {
    username: 'johndoe',
    fullName: 'John Doe',
    avatarUrl: null,
    status: 'ONLINE'
  };

  it('renders initials when no avatarUrl is provided', () => {
    render(<Avatar user={mockUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when avatarUrl is provided', () => {
    const userWithAvatar = { ...mockUser, avatarUrl: 'https://example.com/avatar.png' };
    render(<Avatar user={userWithAvatar} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'johndoe');
  });

  it('renders presence ring when showStatus is true', () => {
    const { container } = render(<Avatar user={mockUser} showStatus={true} />);
    const presenceRing = container.querySelector('.presence-ring');
    expect(presenceRing).toBeInTheDocument();
    expect(presenceRing).toHaveClass('status-online');
  });

  it('does not render presence ring when showStatus is false', () => {
    const { container } = render(<Avatar user={mockUser} showStatus={false} />);
    const presenceRing = container.querySelector('.presence-ring');
    expect(presenceRing).not.toBeInTheDocument();
  });

  it('applies custom size', () => {
    const { container } = render(<Avatar user={mockUser} size={50} />);
    const avatarDiv = container.firstChild;
    expect(avatarDiv).toHaveStyle({ width: '50px', height: '50px' });
  });
});
