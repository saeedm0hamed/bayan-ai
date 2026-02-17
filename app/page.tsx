/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Mic, Upload, Square, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from './components/NavBar';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudio } from './context/AudioContext';
import Link from 'next/link';
import DisclaimerCard from './components/DisclaimerCard';

export default function Home() {
  const router = useRouter();
  const { setAudioFile } = useAudio();
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const uploadAudio = (blobOrFile: Blob | File) => {
    setAudioFile(blobOrFile);
    router.push('/result');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup AudioContext for visualization and processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);

      // Noise reduction filters
      const hpFilter = audioContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 80; // Remove low-end rumble below 80Hz

      const lpFilter = audioContext.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.value = 8000; // Remove high-frequency hiss above 8kHz

      // Create destination for recording processed audio
      const destination = audioContext.createMediaStreamDestination();

      // Connect: Source -> HP Filter -> LP Filter -> Analyser & Destination
      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(analyser);
      lpFilter.connect(destination);

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Setup MediaRecorder for recording the processed stream
      const mediaRecorder = new MediaRecorder(destination.stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        uploadAudio(blob);
      };

      mediaRecorder.start();
      // eslint-disable-next-line
      startTimeRef.current = Date.now();

      // Auto-stop after 60 seconds
      maxRecordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);

      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('الرجاء السماح بالوصول إلى الميكروفون لاستخدام هذه الميزة');
    }
  };

  const stopRecording = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        uploadAudio(file);
      } else {
        alert('يرجى اختيار ملف صوتي أو فيديو صالح');
      }
    }
    // Reset input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (!isRecording || !canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvasCtx) return;

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray as unknown as Uint8Array<ArrayBuffer>);

      canvasCtx.fillStyle = 'rgba(255, 255, 255, 0)'; // Transparent clear
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = '#2563eb'; // Primary color approx
      canvasCtx.beginPath();

      const sliceWidth = (WIDTH * 1.0) / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * HEIGHT) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  return (
    <main className='relative flex flex-col items-center justify-between min-h-screen px-6 py-6 text-foreground bg-background font-readex'>
      <NavBar />

      <div className='hidden w-full md:flex justify-start mt-24 px-6'>
        <div className='w-full md:absolute max-w-sm'>
          <DisclaimerCard />
        </div>
      </div>
      {/* <div style={{ width: '100%', height: '600px', position: 'absolute', zIndex: 0 }}>
        <LightRays
          raysOrigin='top-center'
          raysColor='#1100ff'
          raysSpeed={1}
          lightSpread={0.5}
          rayLength={3}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          className='custom-rays'
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div> */}

      {/* Center content */}
      <section className='flex flex-col items-center justify-center py-12 text-center'>
        <div className='relative p-5'>
          <div className='relative flex flex-row-reverse p-5'>
            <h1 className='text-[2.6rem] md:text-6xl text-nowrap text-(--primary) font-amiri'>
              ﴾ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴿
            </h1>
            <Link
              href={`https://quran.com/73?startingVerse=4`}
              target='_blank'
              className='absolute bottom-0 left-0 text-[0.5rem] md:text-xs text-muted-foreground top-2 hover:underline underline-offset-3'
            >
              [المزمل: 4]
            </Link>
          </div>
          <div className='p-5'>
            <p className='text-[0.5rem] md:text-xs text-muted-foreground' dir='rtl'>
              استخدم الذكاء الاصطناعي للتعرف على السور والآيات من خلال الصوت!
            </p>
          </div>
        </div>

        <motion.div className='relative flex items-center flex-row'>
          {/* Mic button */}
          <div className='relative flex flex-col items-center justify-center w-56 h-56 p-10'>
            {!isRecording && (
              <motion.div
                layoutId='mic-container'
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className='relative flex items-center justify-center hover:cursor-pointer group'
                onClick={startRecording}
              >
                <div className='absolute w-40 h-40 group-hover:scale-110 transition-all duration-500 ease-in-out rounded-full border border-dashed border-(--primary)' />
                <div className='absolute w-40 h-40 group-hover:scale-140 transition-all duration-400 ease-in-out rounded-full border border-dashed border-(--secondary)' />
                <motion.button
                  layoutId='mic-button'
                  className='w-36 h-36 rounded-full bg-linear-to-bl from-(--primary) to-(--secondary) group-hover:to-(--primary) transition-colors duration-300 ease-in-out flex gap-2 flex-col items-center justify-center shadow-xl'
                >
                  <div className='flex items-center justify-center h-10'>
                    <Mic size={40} className='text-white' />
                  </div>
                  <div className='flex flex-col items-center justify-center h-10 text-white'>
                    <motion.p layoutId='mic-text' className='text-base font-medium text-white'>
                      تسجيل مباشر
                    </motion.p>
                  </div>
                </motion.button>

                {/* Processing Overlay DON'T REMOVE */}
                {/* <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'
          >
            <div className='flex flex-col items-center gap-6'>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={60} className='text-(--primary)' />
              </motion.div>
              <div className='flex flex-col items-center gap-2'>
                <h2 className='text-2xl font-bold text-gray-800' dir='rtl'>جاري المعالجة...</h2>
                <p className='text-gray-500' dir='rtl'>يتم استخراج الصوت بجودة عالية</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence> */}
              </motion.div>
            )}

            <div className='absolute right-auto bottom-[-10] md:bottom-[-35] flex items-center justify-center rounded-2xl px-2 py-1 border-border border backdrop-blur-sm cursor-default hover:shadow-sm bg-muted/80 text-xs transition duration-200'>
              <p>حد أقصى 60 ثانية</p>
              <span className='w-1.5 h-1.5 rounded-full bg-yellow-400 mx-1 inline-block' />
            </div>
          </div>

          {/* Divider */}
          <div className='relative flex items-center flex-1 p-1 md:p-10 gap-2 flex-col'>
            <div className='h-14 min-h-[1em] w-px rotate-0 bg-linear-0 from-transparent via-muted-foreground to-transparent opacity-25'></div>
            <p className='text-muted-foreground'>أو</p>
            <div className='h-14 min-h-[1em] w-px rotate-0 bg-linear-0 fr om-transparent via-muted-foreground to-transparent opacity-25'></div>
          </div>

          {/* Audio button */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className='relative flex items-center justify-center p-5 hover:cursor-pointer group'
            onClick={() => fileInputRef.current?.click()}
          >
            <div className='absolute w-40 h-40 group-hover:scale-110 transition-all duration-500 ease-in-out rounded-full border border-dashed border-(--primary)' />
            <div className='absolute w-40 h-40 group-hover:scale-140 transition-all duration-400 ease-in-out rounded-full border border-dashed border-(--secondary)' />
            <input
              type='file'
              ref={fileInputRef}
              className='hidden'
              accept='audio/*,video/*'
              onChange={handleFileUpload}
            />
            <button className='w-36 h-36 rounded-full bg-linear-to-bl from-(--primary) to-(--secondary) group-hover:to-(--primary) transition-colors duration-300 ease-in-out flex gap-2 flex-col items-center justify-center shadow-xl'>
              <div className='flex items-center justify-center h-10'>
                <Upload size={40} className='text-white' />
              </div>
              <div className='flex flex-col h-10 gap-2 text-base font-medium text-white '>
                <p>رفع</p>
                <span className='text-xs text-white/60'>(فيديو - صوت)</span>
              </div>
            </button>
          </motion.div>
        </motion.div>

        <div className='w-full max-w-sm mt-8 md:hidden'>
          <DisclaimerCard />
        </div>
      </section>
      {/* Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'
          >
            <motion.div layoutId='mic-container' className='relative flex items-center justify-center'>
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className='absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2 left-1/2'
              />
              <motion.button
                layoutId='mic-button'
                onClick={stopRecording}
                className='z-10 flex items-center justify-center w-24 h-24 transition-colors duration-300 ease-in-out bg-red-500 rounded-full shadow-xl hover:bg-red-600'
              >
                <Square size={32} className='text-white fill-current' />
              </motion.button>
            </motion.div>
            <motion.p layoutId='mic-text' className='mt-8 text-xl font-medium text-foreground'>
              جاري الاستماع...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Footer stats */}
      <footer className='w-full max-w-xl pt-6 text-sm text-center items-center text-gray-500 border-t border-gray-500'>
        <div className='flex justify-between items-center'>
          <div>
            <p className='text-xs'>سرعة المعالجة</p>
            <p className='font-medium'>0.4 ث</p>
          </div>
          <div>
            <p className='text-xs' dir='rtl'>
              سور تم التعرف عليها حتى الآن بإستخدام Bayan AI
            </p>
            <p className='font-medium text-green-700'>#</p>
          </div>
          <div>
            <p className='text-xs'>دقة التعرف</p>
            <p className='font-medium'>99.8%</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
