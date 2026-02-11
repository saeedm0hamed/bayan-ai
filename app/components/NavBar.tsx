import { History } from 'lucide-react';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const NavBar = () => {
  const router = useRouter();
  return (
    <header className='w-full flex items-center justify-between text-sm text-gray-500'>
      <div className='flex items-center gap-6'>
        <button
          className='flex items-center gap-2 hover:text-black transition duration-300 ease-in-out cursor-pointer hover:scale-105'
          onClick={() => router.push('/history')}
        >
          <History size={18} />
          السجل
        </button>
      </div>
      <div className='flex items-center gap-2 font-medium text-green-700'>
        <Image
          src='black.png'
          alt='logo'
          width={60}
          height={60}
          priority
          unoptimized
          className='transition duration-300 ease-in-out cursor-pointer hover:scale-105'
          onClick={() => router.push('/')}
        />{' '}
      </div>
    </header>
  );
};

export default NavBar;
