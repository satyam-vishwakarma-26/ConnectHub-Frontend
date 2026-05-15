import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input, Button, Badge, Modal, Card, Divider, Spinner } from './index';

describe('UI Components', () => {
  describe('Input', () => {
    it('renders with a label', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('shows error message', () => {
      render(<Input error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
      const { container } = render(<Input type="password" />);
      const inputEl = container.querySelector('input');
      const button = screen.getByRole('button');
      
      expect(inputEl.type).toBe('password');
      
      fireEvent.click(button);
      expect(inputEl.type).toBe('text');
    });
  });

  describe('Button', () => {
    it('renders children', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByText('Click Me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when loading', () => {
      render(<Button loading={true}>Click Me</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders with children', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders when open is true', () => {
      render(<Modal open={true} title="My Modal">Content</Modal>);
      expect(screen.getByText('My Modal')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<Modal open={false} title="My Modal">Content</Modal>);
      expect(screen.queryByText('My Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(<Modal open={true} onClose={handleClose} title="My Modal" />);
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('renders children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });
  });

  describe('Divider', () => {
    it('renders with text', () => {
      render(<Divider text="OR" />);
      expect(screen.getByText('OR')).toBeInTheDocument();
    });

    it('renders horizontal rule when no text', () => {
      const { container } = render(<Divider />);
      expect(container.querySelector('hr')).toBeInTheDocument();
    });
  });

  describe('Spinner', () => {
    it('renders correctly', () => {
      const { container } = render(<Spinner />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
