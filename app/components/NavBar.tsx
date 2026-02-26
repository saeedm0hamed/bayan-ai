import {
  History,
  Download,
  FlaskConical,
  Menu,
  Sun,
  Moon,
  MessageCircleHeart,
  CheckCircle,
  X,
  UserStar,
  ExternalLink,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';

const GOOGLE_FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLScuQGPKkrWiNGV_En9sNPeiLCFn3-e9OprspDrM4grx1XjGtg/formResponse';
const GOOGLE_FORM_ENTRY_ID = 'entry.677950865';

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSuggestionClick = () => {
    setIsSuggestionOpen(true);
    setIsMenuOpen(false);
  };

  const handleSuggestionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!suggestion.trim()) {
      return;
    }

    setIsSubmittingSuggestion(true);
    const body = new URLSearchParams();
    body.append(GOOGLE_FORM_ENTRY_ID, suggestion.trim());

    void fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }).catch(() => {});

    setSuggestionSuccess(true);
    setSuggestion('');
    setIsSubmittingSuggestion(false);

    setTimeout(() => {
      setIsSuggestionOpen(false);
      setSuggestionSuccess(false);
    }, 2000);
  };

  return (
    <header className='fixed px-6 md:px-12 py-6 top-0 w-full flex items-center justify-between text-sm text-muted-foreground z-9999 '>
      <div className='flex items-center gap-2'>
        <button className='flex items-center gap-2 p-2 rounded-full text-muted-foreground transition duration-300 ease-in-out border-border border backdrop-blur-sm cursor-default hover:shadow-sm bg-muted/80 text-xs'>
          نسخة تجريبية
          <FlaskConical size={20} />
        </button>

        <div className='relative' ref={menuRef}>
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

                {/* Suggestion Modal */}
                <button
                  className='flex items-center gap-3 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 w-full min-w-[180px]'
                  onClick={handleSuggestionClick}
                >
                  <span className='flex-1 text-right'>الاقتراحات</span>
                  <MessageCircleHeart size={20} className='dark:text-foreground shrink-0' />
                </button>

                <Link
                  href='https://sae8d.vercel.app/'
                  target='_blank'
                  className='flex items-center gap-3 p-2 rounded-full hover:text-foreground transition duration-300 ease-in-out cursor-pointer hover:bg-muted hover:scale-105 w-full min-w-[180px]'
                >
                  <ExternalLink size={20} className='text-left dark:text-foreground shrink-0' />{' '}
                  <span className='flex-1 text-right'>حول المطور</span>
                  <UserStar size={20} className='dark:text-foreground shrink-0' />
                </Link>
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

      <AnimatePresence>
        {isSuggestionOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className='w-full max-w-md mx-4 rounded-2xl bg-background border border-border shadow-lg p-5 space-y-4'
              dir='rtl'
            >
              <div className='flex items-center justify-between'>
                <h2 className='text-sm font-semibold text-foreground'>إرسال اقتراح</h2>
                <button
                  className='p-1 rounded-full hover:bg-muted cursor-pointer'
                  onClick={() => setIsSuggestionOpen(false)}
                  aria-label='إغلاق'
                >
                  <X size={18} />
                </button>
              </div>

              {suggestionSuccess ? (
                <div className='flex flex-col items-center gap-2 py-6 text-center'>
                  <span className='flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'>
                    <CheckCircle size={22} />
                  </span>
                  <p className='text-sm text-foreground'>تم إرسال الاقتراح بنجاح، شكرًا لك!</p>
                </div>
              ) : (
                <form className='space-y-3' onSubmit={handleSuggestionSubmit}>
                  <div className='space-y-1'>
                    <label className='block text-xs text-muted-foreground'>
                      ما الاقتراح أو الملاحظة التي تود مشاركتها لتحسين بيان؟
                    </label>
                    <textarea
                      className='w-full rounded-xl border border-border bg-background px-3 py-2 mt-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-(--primary) focus:border-transparent min-h-[80px] resize-none'
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                      placeholder='اكتب اقتراحك هنا...'
                      disabled={isSubmittingSuggestion}
                    />
                  </div>
                  <div className='flex justify-between items-center gap-3'>
                    <p className='text-[0.65rem] text-muted-foreground'>يُحفظ الاقتراح دون أي معلومات تعريفية عنك.</p>
                    <button
                      type='submit'
                      disabled={isSubmittingSuggestion || !suggestion.trim()}
                      className='px-4 py-2 rounded-full bg-(--primary) text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition'
                    >
                      {isSubmittingSuggestion ? 'جارٍ الإرسال...' : 'إرسال'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavBar;
