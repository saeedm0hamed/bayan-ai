import { AlertCircle, ShieldCheck } from 'lucide-react';
import React from 'react';

const DisclaimerCard = () => {
  return (
    <div className='w-full md:w-xs p-4 md:p-5 text-right bg-white/80 dark:bg-muted backdrop-blur-sm rounded-2xl border border-border/70 shadow-md text-card-foreground text-xs md:text-sm'>
      <div className='flex items-center gap-2 mb-2' dir='rtl'>
        <span className='flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'>
          <AlertCircle size={16} />
        </span>
        <p className='text-xs font-semibold text-foreground/80'>تنبيه</p>
      </div>
      {/* <p className='mb-1 leading-relaxed' dir='rtl'>
        Bayan AI أداة مساعدة للتدريب على التلاوة وليست بديلاً عن المقرئين أو المصاحف المعتمدة.
      </p> */}
      <div className='flex items-baseline px-2' dir='rtl'>
        <span className='w-1.75 md:w-2.25 h-1 text-xs rounded-full bg-muted-foreground/30 mx-1 inline-block' />

        <p className='mb-2 leading-relaxed text-right text-xs text-muted-foreground' dir='rtl'>
          نتائج المطابقة تقريبية وتحتمل الخطأ لتأثرها بجودة التسجيل، نوع الميكروفون، ومستوى الضوضاء في المكان.
        </p>
      </div>
      <div
        className='mt-3 pt-2 border-t border-border/60 text-muted-foreground text-xs space-y-1 text-[0.7rem]'
        dir='rtl'
      >
        <div className='flex items-center gap-2 mb-2' dir='rtl'>
          <span className='flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'>
            <ShieldCheck size={16} />
          </span>
          <p className='text-xs font-semibold text-foreground/80'>سياسة الخصوصية</p>
        </div>
        <div className='flex items-baseline px-2'>
          <span className='w-1.25 md:w-1.5 h-1 text-xs rounded-full bg-muted-foreground/30 mx-1 inline-block' />
          <p className='text-xs'>لا تُحفظ أيًا من تسجيلاتك الصوتية، وتُحذف فورا بعد اكتمال العمليات المطلوبة.</p>{' '}
        </div>
        {/* <p className='text-xs'>✅ يمكنك استخدام التطبيق بدون إنشاء حساب أو إدخال بيانات شخصية.</p> */}
      </div>

      {/* Stats */}
      <div
        className='mt-3 pt-2 border-t border-border/60 text-muted-foreground text-xs space-y-1 text-[0.7rem]'
        dir='rtl'
      ></div>
      <div className='flex flex-wrap gap-2 mt-2 text-[0.7rem]' dir='rtl'>
        {/* <span className='px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
          v0.1
        </span>
        <span className='px-2 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'>
          متوسط دقة المطابقة ~ 95٪ (بيانات تجريبية)
        </span>
        <span className='px-2 py-1 rounded-full dark:text-muted-foreground bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200'>
          متوسط سرعة المعالجة ~ 3 ث (بيانات تجريبية)
        </span> */}
      </div>
    </div>
  );
};

export default DisclaimerCard;
