/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, History, Settings, Trash2, ExternalLink, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { getHistory, clearHistory, HistoryItem } from '../../utils/history';
import NavBar from '../components/NavBar';

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('هل أنت متأكد من مسح سجل الاستماع؟')) {
      clearHistory();
      setHistoryItems([]);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center bg-background px-6 py-6 text-foreground font-readex'>
      <NavBar />
      <div className='container mx-auto px-4 py-6 max-w-7xl' dir='rtl'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          {/* Sidebar Navigation */}
          <aside className='lg:col-span-3'>
            <nav className='flex flex-col gap-2'>
              <button
                onClick={handleClearHistory}
                className='flex items-center cursor-pointer gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-colors w-full text-right'
              >
                <Trash2 size={20} />
                <span className='font-medium'>مسح السجل</span>
              </button>
              <div className='my-2 border-t border-border'></div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className='lg:col-span-9'>
            <div className='flex items-center gap-4 mb-8'>
              <h2 className='text-2xl font-bold text-foreground font-amiri'>سجل الاستماع</h2>
              <span className='bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full'>
                {historyItems.length} عملية بحث
              </span>
            </div>

            <div className='flex flex-col gap-4'>
              <AnimatePresence>
                {historyItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='text-center py-12 text-muted-foreground'
                  >
                    <p>لا يوجد سجل استماع حتى الآن</p>
                  </motion.div>
                ) : (
                  historyItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className='bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center justify-between group hover:shadow-md transition-shadow text-card-foreground'
                    >
                      <div className='flex items-center gap-4 flex-1'>
                        {/* Number Badge */}
                        <div className='w-12 h-12 bg-(--secondary)/10 rounded-xl flex items-center justify-center text-(--primary) font-bold text-lg shrink-0'>
                          {index + 1}
                        </div>

                        {/* Content */}
                        <div className='flex flex-col gap-1'>
                          <h3 className='font-bold text-foreground text-2xl font-amiri'>سورة {item.surah}</h3>
                          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                            <span className='flex items-center gap-1'>
                              {/* Calendar Icon could go here */}
                              {item.date}
                            </span>
                            <span className='w-1 h-1 bg-border rounded-full'></span>
                            <span className='flex items-center gap-1'>مدة الصوت: {item.duration}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='mr-4'>
                        <Link
                          href={`https://quran.com/${item.surahNumber}?startingVerse=${item.ayahNumber}`}
                          target='_blank'
                          className='w-10 h-10 rounded-full cursor-pointer bg-(--secondary)/10 text-(--primary) flex items-center justify-center hover:bg-(--secondary) hover:text-white transition-colors'
                        >
                          <ExternalLink size={18} />
                        </Link>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Load More Button */}
            {/* <div className='mt-8 flex justify-center'>
              <button className='px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm'>
                عرض المزيد
              </button>
            </div> */}
          </main>
        </div>
      </div>
    </div>
  );
}
