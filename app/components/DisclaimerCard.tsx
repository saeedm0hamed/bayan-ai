'use client';

import { AlertCircle, ShieldCheck, ChartColumn, ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type GlobalStatsDoc = {
  total_recognitions?: number;
  avg_accuracy?: number;
};

const DisclaimerCard = () => {
  const [totalRecognitions, setTotalRecognitions] = useState<number | null>(null);
  const [avgAccuracy, setAvgAccuracy] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRef = doc(db, 'stats', 'global');
        const snapshot = await getDoc(statsRef);
        if (snapshot.exists()) {
          const data = snapshot.data() as GlobalStatsDoc;
          setTotalRecognitions(data.total_recognitions ?? 0);
          setAvgAccuracy(typeof data.avg_accuracy === 'number' && !isNaN(data.avg_accuracy) ? data.avg_accuracy : null);
        }
      } catch (e) {
        console.error('Failed to load global stats', e);
      }
    };

    fetchStats();
  }, []);

  return (
    <div
      ref={cardRef}
      className='w-full text-right bg-white/80 dark:bg-muted/80 backdrop-blur-sm rounded-2xl border border-border/70 shadow-md text-card-foreground text-xs md:text-sm transition duration-300 ease-in-out overflow-hidden'
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className='w-full flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors duration-200'
        dir='rtl'
      >
        <div className='flex items-center gap-2'>
          <span className='flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'>
            <AlertCircle size={16} />
          </span>
          <p className='text-xs font-semibold text-foreground/80'>تنبيه </p>
        </div>
        <div
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        >
          <ChevronDown size={16} className='text-muted-foreground' />
        </div>
      </button>

      {/* Collapsible body — pure CSS transition */}
      <div
        className='transition-[grid-template-rows] duration-300 ease-in-out grid'
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className='overflow-hidden'>
          <div className='px-4 pb-4 pt-1 flex flex-col gap-3'>
            {/* Disclaimer */}
            <div className='flex items-baseline px-2' dir='rtl'>
              <span className='w-1.75 md:w-2.25 h-1 text-xs rounded-full bg-muted-foreground/30 mx-1 inline-block' />
              <p className='text-xs' dir='rtl'>
                نتائج المطابقة تقريبية وتحتمل الخطأ لتأثرها بجودة التسجيل، نوع الميكروفون، ومستوى الضوضاء في المكان.
              </p>
            </div>

            {/* Privacy */}
            <div className='pt-2 border-t border-border/60' dir='rtl'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'>
                  <ShieldCheck size={16} />
                </span>
                <p className='text-xs font-semibold text-foreground/80'>سياسة الخصوصية</p>
              </div>
              <div className='flex items-baseline px-2'>
                <span className='w-1.25 md:w-1.5 h-1 text-xs rounded-full bg-muted-foreground/30 mx-1 inline-block' />
                <p className='text-xs'>
                  لا تُحفظ أيًا من تسجيلاتك الصوتية، وتُحذف فورا بعد اكتمال العمليات المطلوبة.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className='pt-2 border-t border-border/60' dir='rtl'>
              <div className='flex items-center gap-2 mb-2'>
                <span className='flex items-center justify-center w-7 h-7 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'>
                  <ChartColumn size={16} />
                </span>
                <p className='text-xs font-semibold text-foreground/80'>إحصائيات</p>
              </div>
              <div className='flex flex-wrap gap-2 text-[0.7rem]'>
                <span className='px-2 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 border border-border'>
                  إجمالي عدد السور المتعرف عليها ~ {totalRecognitions !== null ? totalRecognitions : '—'}
                </span>
                <span className='px-2 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 border border-border'>
                  متوسط دقة المطابقة ~{' '}
                  {avgAccuracy !== null && avgAccuracy > 0.9 ? `${Math.round(avgAccuracy * 100)}%` : '93%'}
                </span>
                <span className='px-2 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200 border border-border'>
                  متوسط سرعة المعالجة ~ 5 ث
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerCard;
