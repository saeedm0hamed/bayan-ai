'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='flex items-center justify-center w-9 h-9 cursor-pointer hover:scale-105 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-300'
      aria-label={resolvedTheme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    >
      {resolvedTheme === 'dark' ? <Sun size={20} className='text-foreground' /> : <Moon size={20} />}
    </button>
  );
}
