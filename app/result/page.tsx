'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '../context/AudioContext';
import NavBar from '../components/NavBar';
import { CheckCircle, XCircle, ArrowLeft, Hash, ScrollText, Target, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { addToHistory } from '../../utils/history';

export default function ResultPage() {
  const { audioFile } = useAudio();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const isLowSimilarity = useMemo(() => {
    if (!result) return false;
    const score = result.similarity_score;
    return isNaN(score) || score < 0.5;
  }, [result]);

  useEffect(() => {
    if (!audioFile) {
      router.push('/');
      return;
    }

    const uploadAudio = async () => {
      const formData = new FormData();
      formData.append('file', audioFile);

      try {
        // const response = await fetch('https://sae8d-bayan-ai.hf.space/recognize', {
        const response = await fetch('http://localhost:8000/recognize', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult(data);

        // Get media duration (works for both audio and video)
        let durationStr = '0 ث';
        try {
          const media = document.createElement(audioFile.type.startsWith('video/') ? 'video' : 'audio');
          media.src = URL.createObjectURL(audioFile);
          await new Promise((resolve) => {
            media.onloadedmetadata = () => {
              const seconds = Math.round(media.duration);
              durationStr = `${seconds} ث`;
              URL.revokeObjectURL(media.src);
              resolve(null);
            };
            media.onerror = () => {
              URL.revokeObjectURL(media.src);
              resolve(null);
            };
          });
        } catch (e) {
          console.error('Error getting duration', e);
        }

        // Add to history
        // Assuming data structure based on typical API response, modify if needed
        const confidence = data.confidence || 0;

        addToHistory({
          surah: data.surah_name
            ? data.surah_name.match(/\(([^)]+)\)/)[1]
            : data.possible_match.surah_name.match(/\(([^)]+)\)/)[1],
          duration: durationStr,
          surahNumber: data.surah_number || data.possible_match.surah_number,
          ayahNumber: data.ayah_number || data.possible_match.ayah_number,
          confidence: confidence,
        });
      } catch (err) {
        console.error('Upload failed:', err);
        setError('حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    uploadAudio();
  }, [audioFile, router]);

  return (
    <main className='flex flex-col items-center min-h-screen px-6 py-18 text-foreground bg-background font-readex'>
      <NavBar />

      <div className='flex flex-col items-center justify-center flex-1 w-full max-w-2xl'>
        {loading ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'
            >
              <div className='flex flex-col items-center gap-6'>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={60} className='text-(--primary)' />
                </motion.div>
                <div className='flex flex-col items-center gap-2'>
                  <h2 className='text-2xl font-bold text-foreground' dir='rtl'>
                    جاري المعالجة...
                  </h2>
                  <p className='text-muted-foreground' dir='rtl'>
                    يتم استخراج الصوت بجودة عالية
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col items-center gap-6 text-center'
          >
            <XCircle className='w-20 h-20 text-red-500' />
            <h2 className='text-2xl font-bold text-foreground'>عذراً، حدث خطأ</h2>
            <p className='text-muted-foreground'>{error}</p>
            <button
              onClick={() => router.push('/')}
              className='flex items-center gap-2 px-6 py-3 mt-4 transition-colors bg-muted rounded-full hover:bg-muted/80 text-foreground'
            >
              <ArrowLeft size={20} />
              <span>العودة للرئيسية</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col items-center w-full max-w-3xl gap-10 mx-auto'
          >
            {/* Result Card */}
            <div className='w-full p-8 bg-card border border-border shadow-md rounded-3xl md:p-10 text-card-foreground'>
              <div className='flex flex-col items-center gap-6 text-center'>
                {/* Success Badge */}
                {isLowSimilarity ? (
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 text-amber-700 border border-amber-600 bg-amber-100 text-sm'>
                    <AlertCircle className='w-4 h-4' />
                    <p>يرجى المحاولة بصوت أعلى وأوضح</p>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 text-green-700 border border-green-600 bg-green-100 text-sm'>
                    <CheckCircle className='w-4 h-4' />
                    <p>تم التعرف على السورة</p>
                  </div>
                )}

                {/* Surah Name */}
                <h2 className='text-4xl md:text-6xl text-(--primary) font-amiri mt-4' dir='rtl'>
                  سورة{' '}
                  {result.surah_name
                    ? result.surah_name.match(/\(([^)]+)\)/)[1]
                    : result.possible_match.surah_name.match(/\(([^)]+)\)/)[1]}
                </h2>

                {/* Verse */}
                <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  ﴿ {result.verse_text || result.possible_match.verse_text} ﴾
                </p>

                {/* Transcription */}
                <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  {result.transcription}
                </p>

                {/* Meta Info */}
                <div className='flex gap-6 mt-2'>
                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-red-100 rounded-full w-9 h-9'>
                      <ScrollText className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-muted-foreground'>رقم السورة</p>
                    <p className='font-semibold'>{result.surah_number || result.possible_match.surah_number}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-red-100 rounded-full w-9 h-9'>
                      <Hash className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-muted-foreground'>رقم الآية</p>
                    <p className='font-semibold'>{result.ayah_number || result.possible_match.ayah_number}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-red-100 rounded-full w-9 h-9'>
                      <Target className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-muted-foreground'>الدقة</p>
                    <p className={`font-semibold ${isLowSimilarity ? 'text-amber-600' : ''}`}>
                      {isNaN(result.similarity_score) ? '0' : Math.round(result.similarity_score * 100)}%
                    </p>
                  </div>
                </div>

                {/* Primary Action */}
                <Link
                  target='_blank'
                  href={`https://quran.com/${result.surah_number ? result.surah_number : result.possible_match.surah_number}?startingVerse=${result.ayah_number ? result.ayah_number : result.possible_match.ayah_number}`}
                  className='mt-6 w-full md:w-auto px-10 py-4 rounded-full text-white text-lg font-semibold bg-(--primary) cursor-pointer hover:scale-105 transition shadow-lg'
                >
                  قراءة السورة
                </Link>
              </div>
            </div>

            {/* Secondary Action */}
            <button
              onClick={() => router.push('/')}
              className='flex items-center gap-2 text-muted-foreground transition hover:text-foreground'
            >
              <ArrowLeft size={18} />
              <span>تسجيل تلاوة أخرى</span>
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
