/* eslint-disable @typescript-eslint/no-unused-vars */
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
import Grainient from './components/Grainient';

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
  const systemStreamRef = useRef<MediaStream | null>(null);
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
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = micStream;

      let systemStream: MediaStream | null = null;
      try {
        const mediaDevices = navigator.mediaDevices as MediaDevices & {
          getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
        };
        if (typeof mediaDevices.getDisplayMedia === 'function') {
          systemStream = await mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
          });
        }
      } catch {
        systemStream = null;
      }
      systemStreamRef.current = systemStream;

      // Setup AudioContext for visualization and processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const mix = audioContext.createGain();
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(mix);

      if (systemStream && systemStream.getAudioTracks().length > 0) {
        const systemSource = audioContext.createMediaStreamSource(systemStream);
        systemSource.connect(mix);
      }

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
      mix.connect(hpFilter);
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
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach((track) => track.stop());
      systemStreamRef.current = null;
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
    <main className='relative flex flex-col items-center justify-between min-h-screen px-6 py-6 text-foreground font-readex overflow-x-hidden overflow-y-hidden'>
      {/* ── Background layers ── */}
      {/* Layer 0: Grainient animated gradient base */}
      <div className='pointer-events-none absolute inset-0 z-[0] opacity-15 dark:opacity-10'>
        <Grainient
          color1='#9fbaff'
          color2='#5227FF'
          color3='#c4b8ff'
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={0.6}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={30}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={300}
          noiseScale={2}
          grainAmount={0.03}
          grainScale={2}
          grainAnimated={false}
          contrast={1.0}
          gamma={1}
          saturation={0.5}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
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
      {/* All page content sits above the background layers */}
      <NavBar />

      <motion.div
        layoutId='mic-container'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className='hidden w-full md:flex justify-end mt-24 px-6'
      >
        <div className='w-full md:absolute max-w-sm'>
          <DisclaimerCard />
        </div>
      </motion.div>
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
      <section className='relative z-10 flex flex-col items-center justify-center flex-1 text-center w-full py-24 -mt-6 md:-mt-10 lg:-mt-48'>
        <motion.div
          layoutId='mic-container'
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='relative p-5'
        >
          <div className='relative flex flex-row-reverse p-5'>
            <h1 className='text-[2.8rem] sm:text-[2.6rem] md:text-6xl text-nowrap text-(--primary) font-amiri'>
              ﴾ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴿
            </h1>
            <Link
              href={`https://quran.com/73?startingVerse=4`}
              target='_blank'
              className='absolute bottom-0 md:left-0 text-[0.5rem] md:text-xs text-muted-foreground top-2 hover:underline underline-offset-3'
            >
              [المزمل: 4]
            </Link>
          </div>
          <div className='p-2 md:p-5 md:mt-1'>
            <p className='text-[0.6rem] md:text-xs text-muted-foreground' dir='rtl'>
              استخدم الذكاء الاصطناعي للتعرف على السور والآيات من خلال الصوت!
            </p>
          </div>
        </motion.div>

        <motion.div className='relative flex items-center justify-center flex-row w-full '>
          {/* Mic button */}
          <div className='relative flex flex-col items-center justify-center w-40 h-40 sm:w-56 sm:h-56 p-6 sm:p-10'>
            {!isRecording && (
              <motion.div
                layoutId='mic-container'
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className='relative flex items-center justify-center hover:cursor-pointer group'
                onClick={startRecording}
              >
                <div className='absolute w-36 h-36 sm:w-45 sm:h-45 group-hover:scale-110 transition-all duration-500 ease-in-out rounded-full border border-dashed border-(--primary)' />
                <div className='absolute w-32 h-32 sm:w-40 sm:h-40 group-hover:scale-140 transition-all duration-400 ease-in-out rounded-full border border-dashed border-(--secondary)' />
                <motion.button
                  layoutId='mic-button'
                  className='w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-linear-to-bl from-(--primary) to-(--secondary) group-hover:to-(--primary) transition-colors duration-300 ease-in-out flex gap-2 flex-col items-center justify-center shadow-xl'
                >
                  <div className='flex items-center justify-center h-6 sm:h-10'>
                    <Mic size={32} className='text-white sm:hidden' />
                    <Mic size={40} className='text-white hidden sm:block' />
                  </div>
                  <div className='flex flex-col h-10 gap-0 text-base font-medium text-white '>
                    <motion.p layoutId='mic-text' className='text-base font-medium text-white'>
                      تسجيل مباشر
                    </motion.p>
                    <span className='text-xs text-white/60 text-balance' dir='rtl'>
                      (يدعم صوت القرآن في الخلفية)
                    </span>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className='absolute right-auto bottom-[-30] md:bottom-[-30] flex items-center text-slate-700 dark:text-slate-200 justify-center rounded-2xl px-2 py-1 border-border border backdrop-blur-sm cursor-default hover:shadow-sm bg-muted/80 text-xs transition duration-300'
            >
              <p>حد أقصى 60 ثانية</p>
              <span className='w-1.5 h-1.5 rounded-full bg-yellow-400 mx-1 inline-block' />
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className='relative flex items-center flex-col p-1 md:p-10 gap-2'
          >
            <div className='h-14 min-h-[1em] w-px bg-linear-0 from-transparent via-muted-foreground to-transparent opacity-25'></div>
            <p className='text-muted-foreground'>أو</p>
            <div className='h-14 min-h-[1em] w-px bg-linear-0 from-transparent via-muted-foreground to-transparent opacity-25'></div>
          </motion.div>

          {/* Audio button */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className='relative flex items-center justify-center p-5 hover:cursor-pointer group'
            onClick={() => fileInputRef.current?.click()}
          >
            <div className='absolute w-36 h-36 sm:w-45 sm:h-45 group-hover:scale-110 transition-all duration-500 ease-in-out rounded-full border border-dashed border-(--primary)' />
            <div className='absolute w-32 h-32 sm:w-40 sm:h-40 group-hover:scale-140 transition-all duration-400 ease-in-out rounded-full border border-dashed border-(--secondary)' />
            <input
              type='file'
              ref={fileInputRef}
              className='hidden'
              accept='audio/*,video/*'
              onChange={handleFileUpload}
            />
            <button className='w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-linear-to-bl from-(--primary) to-(--secondary) group-hover:to-(--primary) transition-colors duration-300 ease-in-out flex gap-2 flex-col items-center justify-center shadow-xl'>
              <div className='flex items-center justify-center h-6 sm:h-10'>
                <Upload size={32} className='text-white sm:hidden' />
                <Upload size={40} className='text-white hidden sm:block' />
              </div>
              <div className='flex flex-col h-10 gap-0 text-base font-medium text-white '>
                <p>رفع</p>
                <span className='text-xs text-white/60'>(فيديو - صوت)</span>
              </div>
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          layoutId='mic-container'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className='w-full max-w-sm mt-20 md:hidden'
        >
          <DisclaimerCard />
        </motion.div>
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
      {/* <footer className='w-full max-w-xl pt-6 text-sm text-center items-center text-gray-500 border-t border-gray-500'>
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
      </footer> */}
    </main>
  );
}
