'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '../context/AudioContext';
import NavBar from '../components/NavBar';
import { CheckCircle, XCircle, ArrowLeft, Hash, ScrollText, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Waveform } from 'ldrs/react';
import 'ldrs/react/Waveform.css';
import Link from 'next/link';
import { addToHistory } from '../../utils/history';

export default function ResultPage() {
  const { audioFile } = useAudio();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioFile) {
      router.push('/');
      return;
    }

    const uploadAudio = async () => {
      const formData = new FormData();
      formData.append('file', audioFile);

      try {
        const response = await fetch('http://localhost:8000/recognize', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult(data);

        // Get audio duration
        let durationStr = '0 ث';
        try {
          const audio = new Audio(URL.createObjectURL(audioFile));
          await new Promise((resolve) => {
            audio.onloadedmetadata = () => {
              const seconds = Math.round(audio.duration);
              durationStr = `${seconds} ث`;
              URL.revokeObjectURL(audio.src);
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
    <main className='min-h-screen flex flex-col items-center bg-white px-6 py-6 text-gray-800 font-readex'>
      <NavBar />

      <div className='flex-1 flex flex-col items-center justify-center w-full max-w-2xl'>
        {loading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='flex flex-col items-center gap-6'
          >
            <div className='relative'>
              <div className='absolute inset-0 rounded-full blur-xl bg-(--primary)/20 animate-pulse' />
              <Waveform size='35' stroke='3.5' speed='1' color='#1e00ff' />
            </div>
            <p className='text-xl text-gray-500 animate-pulse' dir='rtl'>
              جاري فحص التلاوة...
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex flex-col items-center gap-6 text-center'
          >
            <XCircle className='w-20 h-20 text-red-500' />
            <h2 className='text-2xl font-bold text-gray-800'>عذراً، حدث خطأ</h2>
            <p className='text-gray-600'>{error}</p>
            <button
              onClick={() => router.push('/')}
              className='mt-4 flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors'
            >
              <ArrowLeft size={20} />
              <span>العودة للرئيسية</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='w-full max-w-3xl mx-auto flex flex-col items-center gap-10'
          >
            {/* Result Card */}
            <div className='w-full bg-white rounded-3xl p-8 md:p-10 shadow-md border border-gray-100'>
              <div className='flex flex-col items-center gap-6 text-center'>
                {/* Success Badge */}
                <div className='flex items-center gap-2 rounded-full px-4 py-1.5 text-green-700 border border-green-600 bg-green-100 text-sm'>
                  <CheckCircle className='w-4 h-4' />
                  <p>تم التعرف على السورة</p>
                </div>

                {/* Surah Name */}
                <h2 className='text-4xl md:text-6xl text-(--primary) font-amiri mt-4' dir='rtl'>
                  سورة{' '}
                  {result.surah_name
                    ? result.surah_name.match(/\(([^)]+)\)/)[1]
                    : result.possible_match.surah_name.match(/\(([^)]+)\)/)[1]}
                </h2>

                {/* Verse */}
                <p
                  className='mt-6 w-full rounded-2xl bg-gray-50 px-6 py-6 text-xl md:text-2xl leading-loose font-amiri shadow-inner'
                  dir='rtl'
                >
                  ﴿ {result.verse_text || result.possible_match.verse_text} ﴾
                </p>
                {/* Verse */}
                <p
                  className='mt-6 w-full rounded-2xl bg-gray-50 px-6 py-6 text-xl md:text-2xl leading-loose font-amiri shadow-inner'
                  dir='rtl'
                >
                  ﴿ {result.transcription} ﴾
                </p>

                {/* Meta Info */}
                <div className='flex gap-6 mt-2'>
                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='bg-red-100 w-9 h-9 rounded-full flex items-center justify-center'>
                      <ScrollText className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-gray-500'>رقم السورة</p>
                    <p className='font-semibold'>{result.surah_number || result.possible_match.surah_number}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='bg-red-100 w-9 h-9 rounded-full flex items-center justify-center'>
                      <Hash className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-gray-500'>رقم الآية</p>
                    <p className='font-semibold'>{result.ayah_number || result.possible_match.ayah_number}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='bg-red-100 w-9 h-9 rounded-full flex items-center justify-center'>
                      <Target className='w-4 h-4 text-red-600' />
                    </div>
                    <p className='text-gray-500'>الدقة</p>
                    <p className='font-semibold'>{result.similarity ? '100%' : result.best_similarity * 100}</p>
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
              className='flex items-center gap-2 text-gray-500 hover:text-gray-800 transition'
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
