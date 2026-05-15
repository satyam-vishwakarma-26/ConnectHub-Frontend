import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MessageBubble from './MessageBubble';
import { useAuthStore } from '../../context/authStore';

// Mock useAuthStore
vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn()
}));

describe('MessageBubble', () => {
  const mockUser = { id: '1', username: 'johndoe' };
  const mockMessage = {
    id: 101,
    senderId: '2',
    senderName: 'Jane Smith',
    content: 'Hello world',
    sentAt: new Date().toISOString(),
    deliveryStatus: 'SENT',
    reactions: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({ user: mockUser });
  });

  it('renders message content', () => {
    render(<MessageBubble message={mockMessage} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders "Message deleted" state', () => {
    const deletedMsg = { ...mockMessage, isDeleted: true };
    render(<MessageBubble message={deletedMsg} />);
    expect(screen.getByText('Message deleted')).toBeInTheDocument();
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
  });

  it('shows owner-specific styling when it is the user\'s own message', () => {
    const ownMessage = { ...mockMessage, senderId: '1' };
    const { container } = render(<MessageBubble message={ownMessage} />);
    const bubble = container.querySelector('.msg-bubble-own');
    expect(bubble).toBeInTheDocument();
  });

  it('calls onReact when an emoji is clicked', () => {
    const handleReact = vi.fn();
    render(<MessageBubble message={mockMessage} onReact={handleReact} />);
    
    // Hover is hard to trigger in JSDOM, but we can click the reaction button directly
    const reactionTrigger = screen.getByText('😊');
    fireEvent.click(reactionTrigger);
    
    const thumbEmoji = screen.getByText('👍');
    fireEvent.click(thumbEmoji);
    
    expect(handleReact).toHaveBeenCalledWith(101, '👍');
  });

  it('shows reactions count correctly', () => {
    const messageWithReactions = {
      ...mockMessage,
      reactions: { '👍': ['1', '3'], '❤️': 1 }
    };
    render(<MessageBubble message={messageWithReactions} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // 👍 count
    expect(screen.getByText('1')).toBeInTheDocument(); // ❤️ count
  });

  it('calls onEdit when edit is clicked', () => {
    const handleEdit = vi.fn();
    const ownMessage = { ...mockMessage, senderId: '1' };
    render(<MessageBubble message={ownMessage} onEdit={handleEdit} />);
    
    const menuTrigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(menuTrigger);
    
    const editBtn = screen.getByText('Edit');
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(ownMessage);
  });

  it('calls onDelete when delete is clicked', () => {
    const handleDelete = vi.fn();
    const ownMessage = { ...mockMessage, senderId: '1' };
    render(<MessageBubble message={ownMessage} onDelete={handleDelete} />);
    
    const menuTrigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(menuTrigger);
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(101);
  });

  it('calls onAdminDelete for non-own messages if allowed', () => {
    const handleAdminDelete = vi.fn();
    render(<MessageBubble message={mockMessage} onAdminDelete={handleAdminDelete} canAdminDelete={true} />);
    
    const menuTrigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(menuTrigger);
    
    const adminDeleteBtn = screen.getByText('Admin Delete');
    fireEvent.click(adminDeleteBtn);
    expect(handleAdminDelete).toHaveBeenCalledWith(101);
  });

  it('calls onReact when an existing reaction badge is clicked', () => {
    const handleReact = vi.fn();
    const messageWithReactions = {
      ...mockMessage,
      reactions: { '👍': ['1'] }
    };
    render(<MessageBubble message={messageWithReactions} onReact={handleReact} />);
    
    const reactionBadge = screen.getByText('👍');
    fireEvent.click(reactionBadge);
    
    expect(handleReact).toHaveBeenCalledWith(101, '👍');
  });

  it('calls onReply when reply is clicked', () => {
    const handleReply = vi.fn();
    render(<MessageBubble message={mockMessage} onReply={handleReply} />);
    
    // Reply button is usually the second button in the hover actions
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Reply button
    
    expect(handleReply).toHaveBeenCalledWith(mockMessage);
  });

  it('calls onPin when pin is clicked', () => {
    const handlePin = vi.fn();
    render(<MessageBubble message={mockMessage} onPin={handlePin} canPin={true} />);
    
    const menuTrigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(menuTrigger);
    
    const pinBtn = screen.getByText('Pin');
    fireEvent.click(pinBtn);
    expect(handlePin).toHaveBeenCalledWith(mockMessage);
  });
});
