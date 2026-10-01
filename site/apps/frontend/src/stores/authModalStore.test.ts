// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthModalStore } from './authModalStore';

beforeEach(() => {
  useAuthModalStore.setState({ isOpen: false, mode: 'signin', resetToken: null });
});

describe('authModalStore', () => {
  it('starts closed in signin mode with no reset token', () => {
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe('signin');
    expect(state.resetToken).toBeNull();
  });

  it('open() with no options defaults to signin mode', () => {
    useAuthModalStore.getState().open();
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.mode).toBe('signin');
    expect(state.resetToken).toBeNull();
  });

  it('open({ mode: "signup" }) opens in signup mode', () => {
    useAuthModalStore.getState().open({ mode: 'signup' });
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.mode).toBe('signup');
    expect(state.resetToken).toBeNull();
  });

  it('open({ resetToken }) carries the reset token through', () => {
    useAuthModalStore.getState().open({ resetToken: 'tok-123' });
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.mode).toBe('signin');
    expect(state.resetToken).toBe('tok-123');
  });

  it('open() called again with different options overrides the previous ones', () => {
    useAuthModalStore.getState().open({ mode: 'signup', resetToken: 'tok-123' });
    useAuthModalStore.getState().open({ mode: 'signin' });
    const state = useAuthModalStore.getState();
    expect(state.mode).toBe('signin');
    expect(state.resetToken).toBeNull();
  });

  it('close() resets isOpen, mode, and resetToken', () => {
    useAuthModalStore.getState().open({ mode: 'signup', resetToken: 'tok-123' });
    useAuthModalStore.getState().close();
    const state = useAuthModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe('signin');
    expect(state.resetToken).toBeNull();
  });
});
