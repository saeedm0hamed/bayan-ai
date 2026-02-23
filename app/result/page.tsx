/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from '../context/AudioContext';
import NavBar from '../components/NavBar';
import { CheckCircle, XCircle, ArrowLeft, Hash, ScrollText, Target, AlertCircle, CircleEllipsis } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { db, ensureAnonymousUser } from '@/lib/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { RecognitionResult } from '../context/AudioContext';

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
  const { recognitionResult } = useAudio();
  const router = useRouter();
  const result = recognitionResult;
  const [error] = useState<string | null>(null);
  const hasSavedRef = useRef(false);
  const hasPlayedRef = useRef(false);

  const primaryMatch =
    result?.matches && result.matches.length > 0
      ? result.matches[0]
      : {
          surah_number: result?.surah_number ?? result?.possible_match?.surah_number,
          ayah_number: result?.ayah_number ?? result?.possible_match?.ayah_number,
          similarity_score:
            result?.similarity_score ?? result?.best_similarity ?? result?.possible_match?.similarity_score ?? 0,
          surah_name: result?.surah_name ?? result?.possible_match?.surah_name,
          verse_text: result?.verse_text ?? result?.possible_match?.verse_text,
        };

  const effectiveSurahName = primaryMatch?.surah_name ?? '';
  const effectiveVerseText = primaryMatch?.verse_text ?? '';
  const effectiveSurahNumber = primaryMatch?.surah_number;
  const effectiveAyahNumber = primaryMatch?.ayah_number;
  const effectiveSimilarityScore = primaryMatch?.similarity_score ?? 0;

  const surahNameMatch = effectiveSurahName.match(/\(([^)]+)\)/);
  const displaySurahName = surahNameMatch ? surahNameMatch[1] : effectiveSurahName || 'غير معروفة';

  const accuracyPercentage = Math.round(effectiveSimilarityScore * 100);
  const displayAccuracy = Number.isNaN(accuracyPercentage) ? 0 : accuracyPercentage;

  const saveRecognitionStats = async (data: RecognitionResult) => {
    try {
      const user = await ensureAnonymousUser();
      if (!user) return;

      const anonUid = user.uid;

      const matches =
        data.matches && data.matches.length > 0
          ? data.matches
          : [
              {
                surah_number: data.surah_number ?? data.possible_match?.surah_number,
                ayah_number: data.ayah_number ?? data.possible_match?.ayah_number,
                similarity_score:
                  data.similarity_score ?? data.best_similarity ?? data.possible_match?.similarity_score ?? 0,
                surah_name: data.surah_name ?? data.possible_match?.surah_name,
                verse_text: data.verse_text ?? data.possible_match?.verse_text,
              },
            ].filter((m) => typeof m.surah_number === 'number');

      if (!matches.length) {
        return;
      }

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

        let deltaRecognitions = 0;
        let deltaAccuracySum = 0;

        matches.forEach((m) => {
          const score = m.similarity_score ?? 0;
          const accuracy = typeof score === 'number' && !isNaN(score) ? score : 0;

          totalRecognitions += 1;
          totalAccuracySum += accuracy;

          deltaRecognitions += 1;
          deltaAccuracySum += accuracy;

          if (typeof m.surah_number === 'number') {
            const surahKey = String(m.surah_number);
            const newCount = (surahCounts[surahKey] || 0) + 1;
            surahCounts[surahKey] = newCount;

            if (!mostCommonSurah || newCount > mostCommonSurah.count) {
              mostCommonSurah = { surah: m.surah_number, count: newCount };
            }
          }
        });

        sessionTotalRecognitions += deltaRecognitions;
        sessionTotalAccuracySum += deltaAccuracySum;

        const avgAccuracy = totalRecognitions > 0 ? totalAccuracySum / totalRecognitions : 0;

        const sessionAvgAccuracy =
          sessionTotalRecognitions > 0 ? sessionTotalAccuracySum / sessionTotalRecognitions : 0;

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

        matches.forEach((m) => {
          const score = m.similarity_score ?? 0;
          const accuracy = typeof score === 'number' && !isNaN(score) ? score : 0;

          const recognitionDocRef = doc(recognitionsCollectionRef);

          transaction.set(recognitionDocRef, {
            surah: m.surah_number,
            ayah: m.ayah_number,
            accuracy,
            surah_name: m.surah_name ?? '',
            verse_text: m.verse_text ?? '',
            timestamp: serverTimestamp(),
          });
        });
      });
    } catch (e) {
      console.error('Failed to save recognition stats', e);
    }
  };

  const matchesList = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.matches) && result.matches.length > 0) return result.matches;
    if (result.possible_match) return [result.possible_match];
    return [result];
  }, [result]);

  const topMatch = useMemo(() => {
    if (!matchesList.length) return null;
    return [...matchesList].sort((a, b) => {
      const aScore = typeof a.similarity_score === 'number' ? a.similarity_score : 0;
      const bScore = typeof b.similarity_score === 'number' ? b.similarity_score : 0;
      return bScore - aScore;
    })[0];
  }, [matchesList]);

  const isLowSimilarity = useMemo(() => {
    if (!topMatch) return false;
    const score = typeof topMatch.similarity_score === 'number' ? topMatch.similarity_score : 0;
    return isNaN(score) || score < 0.5;
  }, [topMatch]);

  useEffect(() => {
    if (!recognitionResult) {
      router.push('/');
      return;
    }
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    saveRecognitionStats(recognitionResult);
  }, [recognitionResult, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (result && !error && !hasPlayedRef.current) {
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
  }, [result, error]);

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
        {error ? (
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
              className='flex items-center gap-2 px-6 py-3 mt-4 transition-colors bg-muted rounded-full hover:bg-muted/80 cursor-pointer text-foreground'
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
                ) : matchesList.length > 1 ? (
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

                <h2 className='text-4xl md:text-6xl text-foreground font-amiri mt-4' dir='rtl'>
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

                {/* Other matches */}
                {matchesList.length > 1 && (
                  <div className='w-full mt-6 space-y-4'>
                    <h3 className='text-lg font-semibold' dir='rtl'>
                      سور أخرى مطابقة
                    </h3>
                    <div className='flex flex-col gap-4' dir='rtl'>
                      {matchesList.slice(1).map((match: any, index: number) => {
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
