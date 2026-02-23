'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '../context/AudioContext';
import NavBar from '../components/NavBar';
import { CheckCircle, XCircle, ArrowLeft, Hash, ScrollText, Target, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { db, ensureAnonymousUser } from '@/lib/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

type RecognitionResult = {
  surah_number?: number;
  ayah_number?: number;
  similarity_score?: number;
  best_similarity?: number;
  possible_match?: {
    surah_number?: number;
    ayah_number?: number;
    similarity_score?: number;
    surah_name?: string;
    verse_text?: string;
  };
  surah_name?: string;
  verse_text?: string;
  confidence?: number;
};

type GlobalStatsDoc = {
  total_recognitions?: number;
  total_accuracy_sum?: number;
  surah_counts?: Record<string, number>;
  most_common_surah?: { surah: number; count: number } | null;
};

type SessionStatsDoc = {
  session_id?: string;
  total_recognitions?: number;
  total_accuracy_sum?: number;
};

export default function ResultPage() {
  const { audioFile } = useAudio();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasUploadedRef = useRef(false);
  const hasPlayedRef = useRef(false);

  const effectiveSurahName = result?.surah_name ?? result?.possible_match?.surah_name ?? '';
  const effectiveVerseText = result?.verse_text ?? result?.possible_match?.verse_text ?? '';
  const effectiveSurahNumber = result?.surah_number ?? result?.possible_match?.surah_number;
  const effectiveAyahNumber = result?.ayah_number ?? result?.possible_match?.ayah_number;
  const effectiveSimilarityScore =
    result?.similarity_score ?? result?.best_similarity ?? result?.possible_match?.similarity_score ?? 0;

  const surahNameMatch = effectiveSurahName.match(/\(([^)]+)\)/);
  const displaySurahName = surahNameMatch ? surahNameMatch[1] : effectiveSurahName || 'غير معروفة';

  const accuracyPercentage = Math.round(effectiveSimilarityScore * 100);
  const displayAccuracy = Number.isNaN(accuracyPercentage) ? 0 : accuracyPercentage;

  const saveRecognitionStats = async (data: RecognitionResult) => {
    try {
      const user = await ensureAnonymousUser();
      if (!user) return;

      const anonUid = user.uid;

      const surahNumber = data.surah_number || data.possible_match?.surah_number;
      const ayahNumber = data.ayah_number || data.possible_match?.ayah_number;
      const score = data.similarity_score ?? data.best_similarity ?? data.possible_match?.similarity_score ?? 0;
      const accuracy = typeof score === 'number' && !isNaN(score) ? score : 0;

      const statsDocRef = doc(db, 'stats', 'global');

      await runTransaction(db, async (transaction) => {
        const sessionsDocRef = doc(collection(statsDocRef, 'sessions'), anonUid);

        const snapshot = await transaction.get(statsDocRef);

        let totalRecognitions = 0;
        let totalAccuracySum = 0;
        let surahCounts: Record<string, number> = {};
        let mostCommonSurah: { surah: number; count: number } | null = null;

        if (snapshot.exists()) {
          const current = snapshot.data() as GlobalStatsDoc;
          totalRecognitions = current.total_recognitions || 0;
          totalAccuracySum = current.total_accuracy_sum || 0;
          surahCounts = current.surah_counts || {};
          mostCommonSurah = current.most_common_surah || null;
        }

        totalRecognitions += 1;
        totalAccuracySum += accuracy;

        if (typeof surahNumber === 'number') {
          const surahKey = String(surahNumber);
          const newCount = (surahCounts[surahKey] || 0) + 1;
          surahCounts[surahKey] = newCount;

          if (!mostCommonSurah || newCount > mostCommonSurah.count) {
            mostCommonSurah = { surah: surahNumber, count: newCount };
          }
        }

        const avgAccuracy = totalRecognitions > 0 ? totalAccuracySum / totalRecognitions : 0;

        const sessionSnapshot = await transaction.get(sessionsDocRef);

        let sessionId =
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()) || `sess_${Date.now()}`;
        let sessionTotalRecognitions = 0;
        let sessionTotalAccuracySum = 0;

        if (sessionSnapshot.exists()) {
          const current = sessionSnapshot.data() as SessionStatsDoc;
          sessionId = current.session_id || sessionId;
          sessionTotalRecognitions = current.total_recognitions || 0;
          sessionTotalAccuracySum = current.total_accuracy_sum || 0;
        }

        sessionTotalRecognitions += 1;
        sessionTotalAccuracySum += accuracy;

        const sessionAvgAccuracy =
          sessionTotalRecognitions > 0 ? sessionTotalAccuracySum / sessionTotalRecognitions : 0;

        const surahName = data.surah_name || data.possible_match?.surah_name || '';

        const verseText = data.verse_text || data.possible_match?.verse_text || '';

        transaction.set(
          statsDocRef,
          {
            total_recognitions: totalRecognitions,
            total_accuracy_sum: totalAccuracySum,
            avg_accuracy: avgAccuracy,
            most_common_surah: mostCommonSurah,
            surah_counts: surahCounts,
            last_updated: serverTimestamp(),
          },
          { merge: true },
        );

        transaction.set(
          sessionsDocRef,
          {
            session_id: sessionId,
            total_recognitions: sessionTotalRecognitions,
            total_accuracy_sum: sessionTotalAccuracySum,
            avg_accuracy: sessionAvgAccuracy,
          },
          { merge: true },
        );

        const recognitionsCollectionRef = collection(sessionsDocRef, 'recognitions');
        const recognitionDocRef = doc(recognitionsCollectionRef);

        transaction.set(recognitionDocRef, {
          surah: surahNumber,
          ayah: ayahNumber,
          accuracy,
          surah_name: surahName,
          verse_text: verseText,
          timestamp: serverTimestamp(),
        });
      });
    } catch (e) {
      console.error('Failed to save recognition stats', e);
    }
  };

  const isLowSimilarity = useMemo(() => {
    if (!result) return false;
    const score = result.similarity_score ?? result.best_similarity ?? result.possible_match?.similarity_score ?? 0;
    return isNaN(score) || score < 0.5;
  }, [result]);

  useEffect(() => {
    if (!audioFile) {
      router.push('/');
      return;
    }

    if (hasUploadedRef.current) {
      return;
    }
    hasUploadedRef.current = true;

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

        const data: RecognitionResult = await response.json();
        setResult(data);

        await saveRecognitionStats(data);
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
    if (!loading && result && !error && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
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
    <main className='relative flex flex-col items-center min-h-screen px-6 py-18 text-foreground bg-background font-readex overflow-x-hidden overflow-y-hidden'>
      {/* Layer 1: soft radial gradient base */}
      <div className='pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(44,103,242,0.18),transparent)] dark:bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(30,0,255,0.22),transparent)]' />
      {/* Layer 2: large blurry blob — primary colour, top-center */}
      <div className='pointer-events-none absolute z-[2] top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[560px] rounded-full bg-[#2c67f2]/25 dark:bg-[#1e00ff]/20 blur-[100px]' />
      {/* Layer 3: smaller accent blob — bottom right */}
      <div className='pointer-events-none absolute z-[2] bottom-[-8%] right-[-8%] w-[400px] h-[360px] rounded-full bg-[#2c67f2]/15 dark:bg-[#1e00ff]/14 blur-[80px]' />
      {/* Layer 4: subtle dot-grid texture */}
      <div
        className='pointer-events-none absolute inset-0 z-[3] opacity-[0.06] dark:opacity-[0.07]'
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <NavBar />

      <div className='relative flex flex-col items-center justify-center flex-1 w-full max-w-2xl overflow-x-hidden overflow-y-hidden'>
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
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5 text-amber-700 border border-amber-600 bg-amber-100 text-sm'>
                    <AlertCircle className='w-4 h-4' />
                    <p>يرجى المحاولة بصوت أعلى وأوضح</p>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 rounded-full px-4 py-1.5  text-green-700 border border-green-600 bg-green-100 text-sm'>
                    <CheckCircle className='w-4 h-4' />
                    <p>تم التعرف على السورة</p>
                  </div>
                )}

                <h2 className='text-4xl md:text-6xl text-black dark:invert font-amiri mt-4' dir='rtl'>
                  سورة {displaySurahName}
                </h2>

                <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  ﴿ {effectiveVerseText} ﴾
                </p>

                {/* Transcription */}
                {/* <p
                  className='w-full px-6 py-6 mt-6 text-xl leading-loose shadow-inner rounded-2xl bg-muted md:text-2xl font-amiri'
                  dir='rtl'
                >
                  {result.transcription}
                </p> */}

                {/* Meta Info */}
                <div className='flex gap-6 mt-2'>
                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <ScrollText className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>رقم السورة</p>
                    <p className='font-semibold'>{effectiveSurahNumber ?? '-'}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <Hash className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>رقم الآية</p>
                    <p className='font-semibold'>{effectiveAyahNumber ?? '-'}</p>
                  </div>

                  <div className='flex flex-col items-center gap-1 text-sm'>
                    <div className='flex items-center justify-center bg-primary/20 rounded-full w-9 h-9'>
                      <Target className='w-4 h-4 text-primary' />
                    </div>
                    <p className='text-muted-foreground'>الدقة</p>
                    <p className={`font-semibold ${isLowSimilarity ? 'text-amber-600' : ''}`}>{displayAccuracy}%</p>
                  </div>
                </div>

                {/* Primary Action */}
                <Link
                  target='_blank'
                  href={
                    effectiveSurahNumber && effectiveAyahNumber
                      ? `https://quran.com/${effectiveSurahNumber}?startingVerse=${effectiveAyahNumber}`
                      : 'https://quran.com'
                  }
                  className='mt-6 w-full md:w-auto px-10 py-4 rounded-full text-white text-lg font-semibold bg-(--primary) cursor-pointer hover:scale-105 transition shadow-lg'
                >
                  قراءة السورة
                </Link>
              </div>
            </div>

            {/* Secondary Action */}
            <button
              onClick={() => router.push('/')}
              className='flex items-center cursor-pointer gap-2 text-muted-foreground transition hover:text-foreground'
            >
              <ArrowLeft size={18} />
              <span>التعرف على سورة أخرى</span>
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
