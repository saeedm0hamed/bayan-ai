/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '../context/AudioContext';
import NavBar from '../components/NavBar';
import { CheckCircle, XCircle, ArrowLeft, Hash, ScrollText, Target, Loader2, CircleEllipsis } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { addToHistory } from '../../utils/history';
import { logSurahRecognized, incrementSurahRecognizedCount, getSurahRecognizedCount } from '../../lib/firebase';

export default function ResultPage() {
  const { audioFile } = useAudio();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalRecognitions, setTotalRecognitions] = useState<number | null>(null);

  const matches = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.matches)) return result.matches;
    if (result.possible_match) return [result.possible_match];
    return [result];
  }, [result]);

  const topMatch = useMemo(() => {
    if (!matches.length) return null;
    return [...matches].sort((a, b) => {
      const aScore = typeof a.similarity_score === 'number' ? a.similarity_score : 0;
      const bScore = typeof b.similarity_score === 'number' ? b.similarity_score : 0;
      return bScore - aScore;
    })[0];
  }, [matches]);

  const primarySurahName = useMemo(() => {
    const rawName = topMatch?.surah_name || (result && (result.surah_name || result.possible_match?.surah_name)) || '';
    if (typeof rawName !== 'string') return '';
    const match = rawName.match(/\(([^)]+)\)/);
    return match ? match[1] : rawName;
  }, [topMatch, result]);

  const similarityPercent = useMemo(() => {
    const score =
      typeof topMatch?.similarity_score === 'number'
        ? topMatch.similarity_score
        : typeof result?.best_similarity === 'number'
          ? result.best_similarity
          : typeof result?.possible_match?.similarity_score === 'number'
            ? result.possible_match.similarity_score
            : 0;
    if (isNaN(score)) return 0;
    return Math.round(score * 100);
  }, [topMatch, result]);

  const isLowSimilarity = useMemo(() => {
    if (!topMatch) return false;
    const score = typeof topMatch.similarity_score === 'number' ? topMatch.similarity_score : 0;
    return isNaN(score) || score < 0.5;
  }, [topMatch]);

  useEffect(() => {
    if (!audioFile) {
      router.push('/');
      return;
    }

    const uploadAudio = async () => {
      const formData = new FormData();
      formData.append('file', audioFile);

      try {
        const response = await fetch('https://sae8d-bayan-ai.hf.space/recognize', {
          // const response = await fetch('http://localhost:8000/recognize', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResult(data);

        const dataMatches = Array.isArray(data.matches)
          ? data.matches
          : data.possible_match
            ? [data.possible_match]
            : [data];
        const bestMatch = dataMatches.length
          ? [...dataMatches].sort((a, b) => {
              const aScore = typeof a.similarity_score === 'number' ? a.similarity_score : 0;
              const bScore = typeof b.similarity_score === 'number' ? b.similarity_score : 0;
              return bScore - aScore;
            })[0]
          : null;

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

        const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
        const similarity =
          typeof data.best_similarity === 'number'
            ? data.best_similarity
            : typeof bestMatch?.similarity_score === 'number'
              ? bestMatch.similarity_score
              : typeof data.possible_match?.similarity_score === 'number'
                ? data.possible_match.similarity_score
                : 0;

        const rawSurahName = bestMatch?.surah_name || data.surah_name || data.possible_match?.surah_name || '';
        const surahNameMatch = typeof rawSurahName === 'string' ? rawSurahName.match(/\(([^)]+)\)/) : null;
        const surahName = surahNameMatch ? surahNameMatch[1] : rawSurahName;

        const surahNumber = bestMatch?.surah_number || data.surah_number || data.possible_match?.surah_number;
        const ayahNumber = bestMatch?.ayah_number || data.ayah_number || data.possible_match?.ayah_number;

        addToHistory({
          surah: surahName,
          duration: durationStr,
          surahNumber,
          ayahNumber,
          confidence,
          verseText: bestMatch?.verse_text || data.verse_text || data.possible_match?.verse_text,
          similarity,
        });

        void logSurahRecognized({
          surah: surahName,
          surahNumber: String(surahNumber),
          ayahNumber: String(ayahNumber),
          confidence,
          duration: durationStr,
          similarity,
        });

        try {
          await incrementSurahRecognizedCount();
          const count = await getSurahRecognizedCount();
          setTotalRecognitions(count);
        } catch {
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setError('حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    uploadAudio();
  }, [audioFile, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!loading && result && !error) {
      const win = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextClass = win.AudioContext || win.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.25);
      oscillator.onended = () => {
        gainNode.disconnect();
        oscillator.disconnect();
        audioContext.close();
      };
    }
  }, [loading, result, error]);

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
            <XCircle className='w-20 h-20 text-primary-500' />
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
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-600 text-sm'>
                    <XCircle className='w-4 h-4' />
                    <p>يرجى المحاولة بصوت أعلى وأوضح</p>
                  </div>
                ) : matches.length > 1 ? (
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-600 text-sm'>
                    <CircleEllipsis className='w-4 h-4' />
                    <p>تم التعرف على أكثر من سورة مطابقة بنجاح</p>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-600 text-sm'>
                    <CheckCircle className='w-4 h-4' />
                    <p>تم التعرف على السورة بنجاح</p>
                  </div>
                )}

                {/* Surah Name */}
                <h2 className='text-4xl md:text-6xl text-(--primary) font-amiri mt-4' dir='rtl'>
                  سورة {primarySurahName}
                </h2>

                {/* Verse */}
                <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  ﴿ {topMatch?.verse_text || result.verse_text || result.possible_match.verse_text} ﴾
                </p>

                {/* Transcription */}
                {/* <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  {result.transcription}
                </p> */}

                {/* Meta Info */}
                <div className='flex gap-6 mt-2 flex-wrap justify-center'>
                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <ScrollText className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>رقم السورة</p>
                    <p className='font-semibold'>
                      {topMatch?.surah_number || result.surah_number || result.possible_match.surah_number}
                    </p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <Hash className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>رقم الآية</p>
                    <p className='font-semibold'>
                      {topMatch?.ayah_number || result.ayah_number || result.possible_match.ayah_number}
                    </p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <Target className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>الدقة</p>
                    <p className={`font-semibold ${isLowSimilarity ? 'text-amber-600' : ''}`}>{similarityPercent}%</p>
                  </div>

                  {totalRecognitions !== null && (
                    <div className='flex flex-col items-center gap-1 text-sm'>
                      <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                        <Hash className='w-4 h-4 text-primary' />
                      </div>
                      <p className='text-muted-foreground'>إجمالي مرات التعرف</p>
                      <p className='font-semibold'>{totalRecognitions}</p>
                    </div>
                  )}
                </div>

                {/* Primary Action */}
                <Link
                  target='_blank'
                  href={`https://quran.com/${topMatch?.surah_number ? topMatch.surah_number : result.surah_number ? result.surah_number : result.possible_match.surah_number}?startingVerse=${topMatch?.ayah_number ? topMatch.ayah_number : result.ayah_number ? result.ayah_number : result.possible_match.ayah_number}`}
                  className='mt-6 w-full md:w-auto px-10 py-4 rounded-full text-white text-lg font-semibold bg-(--primary) cursor-pointer hover:scale-105 transition shadow-lg'
                >
                  قراءة السورة
                </Link>

                {matches.length > 1 && (
                  <div className='w-full mt-6 space-y-4'>
                    <h3 className='text-lg font-semibold' dir='rtl'>
                      سور أخرى مطابقة
                    </h3>
                    <div className='flex flex-col gap-4' dir='rtl'>
                      {matches.slice(1).map((match: any, index: any) => {
                        const matchSurahName = typeof match.surah_name === 'string' ? match.surah_name : '';
                        const arabicNameMatch = matchSurahName.match(/\(([^)]+)\)/);
                        const arabicName = arabicNameMatch ? arabicNameMatch[1] : matchSurahName;
                        const matchPercent =
                          typeof match.similarity_score === 'number' ? Math.round(match.similarity_score * 100) : 0;
                        return (
                          <Link
                            key={`${match.surah_number}-${match.ayah_number}-${index}`}
                            href={`https://quran.com/${match.surah_number}?startingVerse=${match.ayah_number}`}
                            target='_blank'
                            className='flex flex-col items-start w-full p-4 text-right border rounded-2xl bg-muted/60 hover:bg-muted transition'
                          >
                            <div className='flex items-center justify-between w-full gap-2'>
                              <p className='font-amiri text-xl'>
                                <span className='text-(--primary)'> سورة {arabicName}</span>
                                <span className='text-muted-foreground'> - آية {match.ayah_number}</span>
                              </p>
                              <span className='text-sm text-muted-foreground'>{matchPercent}%</span>
                            </div>
                            <p className='mt-2 text-base leading-relaxed font-amiri'>﴿ {match.verse_text} ﴾</p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
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
