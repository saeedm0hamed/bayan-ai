import { History, Download, FlaskConical, Menu, Sun, Moon, Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const NavBar = () => {
  const router = useRouter();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateInstalledState = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIosStandalone);
    };

    updateInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('DOMContentLoaded', updateInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('DOMContentLoaded', updateInstalledState);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (!installPromptEvent) {
      if (typeof window !== 'undefined') {
        window.alert('التثبيت غير متاح حالياً على هذا المتصفح. الرجاء استخدام خيار "إضافة إلى الشاشة الرئيسية".');
      }
      return;
    }

    const choice = await installPromptEvent.prompt();
    if (choice.outcome === 'accepted') {
      setInstallPromptEvent(null);
    }
  };

  return (
    <header className='absolute px-6 md:px-12 py-6 top-0 w-full flex items-center justify-between text-sm text-muted-foreground'>
      <div className='flex items-center gap-2'>
        <button className='flex items-center gap-2 p-2 rounded-full text-muted-foreground transition duration-300 ease-in-out bg-muted'>
          نسخة تجريبية
          <FlaskConical size={20} />
        </button>

        <div className='relative'>
          <button
            className='flex items-center gap-2 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105'
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-haspopup='true'
            aria-expanded={isMenuOpen}
          >
            <Menu size={20} className='dark:text-foreground' />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className='absolute z-50 mt-2 flex flex-col gap-2 p-2 dark:bg-muted rounded-2xl bg-background border border-border shadow-lg origin-top'
              >
                {/* Theme toggle */}
                <button
                  className='flex items-center gap-3 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 w-full min-w-[180px]'
                  onClick={toggleTheme} 
                >
                  <span className='flex-1 text-right'>
                    {resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
                  </span>
                  {resolvedTheme === 'dark' ? (
                    <Sun size={20} className='text-foreground shrink-0' />
                  ) : (
                    <Moon size={20} className='shrink-0' />
                  )}
                </button>

                {/* History */}
                <button
                  className='flex items-center gap-3 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 w-full min-w-[180px]'
                  onClick={() => {
                    router.push('/history');
                    setIsMenuOpen(false);
                  }}
                >
                  <span className='flex-1 text-right'>السجل</span>
                  <History size={20} className='dark:text-foreground shrink-0' />
                </button>

                {/* About */}
                <button className='flex items-center gap-3 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 w-full min-w-[180px]'>
                  <span className='flex-1 text-right'>حول التطبيق</span>
                  <Info size={20} className='dark:text-foreground shrink-0' />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          className='flex items-center gap-2 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-default'
          onClick={handleInstallClick}
          disabled={isInstalled}
          aria-label='تثبيت التطبيق'
        >
          <Download size={20} className='dark:text-foreground' />
        </button>
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
