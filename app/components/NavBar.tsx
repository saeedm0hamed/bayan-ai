import { History } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';

const NavBar = () => {
  const router = useRouter();
  return (
    <header className='w-full flex items-center justify-between text-sm text-muted-foreground'>
      <div className='flex items-center gap-4'>
        <button
          className='flex items-center gap-2 hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:scale-105'
          onClick={() => router.push('/history')}
        >
          <History size={18} />
          السجل
        </button>
        <ThemeToggle />
      </div>
      <div className='flex items-center gap-2 font-medium text-green-700 dark:text-green-400'>
        <Image
          src='black.png'
          alt='logo'
          width={60}
          height={60}
          priority
          unoptimized
          className='transition duration-300 ease-in-out cursor-pointer hover:scale-105 dark:invert'
          onClick={() => router.push('/')}
        />{' '}
      </div>
    </header>
  );
};

export default NavBar;
