'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { db, ensureAnonymousUser } from '@/lib/firebase';
import { collection, doc, getDocs, orderBy, query, writeBatch } from 'firebase/firestore';
import NavBar from '../components/NavBar';

type HistoryItem = {
  id: string;
  surah: string;
  ayahNumber: number;
  similarity?: number;
  verseText?: string;
  surahNumber: number;
};

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const user = await ensureAnonymousUser();
        if (!user) {
          setHistoryItems([]);
          return;
        }

        const statsDocRef = doc(db, 'stats', 'global');
        const sessionsDocRef = doc(collection(statsDocRef, 'sessions'), user.uid);
        const recognitionsCollectionRef = collection(sessionsDocRef, 'recognitions');

        const q = query(recognitionsCollectionRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        const items: HistoryItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as {
            surah?: number;
            surah_name?: string;
            ayah?: number;
            accuracy?: number;
            verse_text?: string;
          };

          let surahDisplay = '';
          if (data.surah_name) {
            const match = data.surah_name.match(/\(([^)]+)\)/);
            surahDisplay = match ? match[1] : data.surah_name;
          } else if (typeof data.surah === 'number') {
            surahDisplay = String(data.surah);
          }

          return {
            id: docSnap.id,
            surah: surahDisplay,
            surahNumber: typeof data.surah === 'number' ? data.surah : 0,
            ayahNumber: data.ayah ?? 0,
            similarity: typeof data.accuracy === 'number' ? data.accuracy : undefined,
            verseText: data.verse_text,
          };
        });

        setHistoryItems(items);
      } catch (e) {
        console.error('Failed to load history from Firestore', e);
        setHistoryItems([]);
      }
    };

    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm('هل أنت متأكد من مسح سجل السور')) {
      return;
    }

    try {
      const user = await ensureAnonymousUser();
      if (!user) {
        setHistoryItems([]);
        return;
      }

      const statsDocRef = doc(db, 'stats', 'global');
      const sessionsDocRef = doc(collection(statsDocRef, 'sessions'), user.uid);
      const recognitionsCollectionRef = collection(sessionsDocRef, 'recognitions');

      const snapshot = await getDocs(recognitionsCollectionRef);
      if (snapshot.empty) {
        setHistoryItems([]);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      setHistoryItems([]);
    } catch (e) {
      console.error('Failed to clear history from Firestore', e);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center bg-background px-6 py-18 text-foreground font-readex'>
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
              <h2 className='text-2xl font-bold text-foreground font-amiri'>سجل السور</h2>
              <span className='bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full'>
                {historyItems.length} عملية تعرف
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
                    <p>لا يوجد سجل سور حتى الآن</p>
                  </motion.div>
                ) : (
                  historyItems.map((item, index) => {
                    const similarityPercent =
                      typeof item.similarity === 'number' && !isNaN(item.similarity)
                        ? Math.round(item.similarity * 100)
                        : null;

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={`https://quran.com/${item.surahNumber}?startingVerse=${item.ayahNumber}`}
                          target='_blank'
                          className='flex flex-col group items-start w-full p-4 relative text-right border rounded-2xl bg-muted/60 hover:bg-muted transition text-card-foreground'
                        >
                          <div className='flex items-center justify-between w-full gap-2'>
                            <p className='font-amiri text-xl'>
                              <span className='text-(--primary)'> سورة {item.surah}</span>
                              <span className='text-muted-foreground'> - آية {item.ayahNumber}</span>
                            </p>
                            <span className=' text-sm text-muted-foreground'>
                              {similarityPercent !== null ? `${similarityPercent}%` : '—'}
                            </span>
                            <button className='w-10 h-10 absolute left-3 bottom-2 rounded-full cursor-pointer bg-(--secondary)/10 text-(--primary) flex items-center justify-center group-hover:bg-(--secondary)/50 group-hover:text-white transition-colors'>
                              <ExternalLink size={18} />
                            </button>
                          </div>
                          <p className='mt-2 text-base leading-relaxed font-amiri'>﴿ {item.verseText || ''} ﴾</p>
                        </Link>
                      </motion.div>
                    );
                  })
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
