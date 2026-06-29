import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Course, Document } from '../../types';
import { documentService } from '../../services/document.service';
import { Loader } from '../common/Loader';

interface AudioRecorderProps {
  courses: Course[];
  onUploaded: (doc: Document) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ courses, onUploaded }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    stopTimer();
    setRecordingTime(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course before recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          toast.error('No audio recorded');
          return;
        }

        await uploadRecording(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // chunk every second
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
      toast.success('Microphone active. Recording lecture...');
    } catch (err: any) {
      console.error(err);
      toast.error('Microphone access denied or unsupported by browser');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        // Resume timer
        timerIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        stopTimer();
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  };

  const uploadRecording = async (blob: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `lecture-recording-${timestamp}.webm`, {
      type: 'audio/webm',
    });

    try {
      const doc = await documentService.upload(file, selectedCourse, (progress) => {
        setUploadProgress(progress);
      });
      onUploaded(doc);
      toast.success('Lecture uploaded successfully! Transcription and study guide generation started.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload lecture audio');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Course Selection */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/60">Target Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          disabled={isRecording || isUploading}
          className="input-field text-white disabled:opacity-50"
        >
          <option value="" className="bg-[#1a1d27]">Select course...</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id} className="bg-[#1a1d27]">
              {c.title} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Recording Interface */}
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/[0.01] space-y-4 text-center">
        {isUploading ? (
          <div className="w-full py-4">
            <Loader message="Uploading Voice Lecture..." />
            <div className="progress-bar max-w-xs mx-auto mt-3">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-[10px] text-white/45 mt-1 block">{uploadProgress}% uploaded</span>
          </div>
        ) : isRecording ? (
          <div className="space-y-4 py-4 w-full">
            {/* Live Indicator */}
            <div className="flex items-center justify-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full bg-red-500 ${isPaused ? '' : 'animate-ping'}`} />
              <span className="text-xs font-bold text-red-400 tracking-wider">
                {isPaused ? 'RECORDING PAUSED' : 'LIVE RECORDING'}
              </span>
            </div>

            {/* Large Timer */}
            <div className="text-4xl font-mono font-black text-white">{formatTime(recordingTime)}</div>

            {/* Pulse Animation visualizer */}
            {!isPaused && (
              <div className="flex justify-center items-center gap-1.5 h-6">
                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${h * 4}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Recording Actions */}
            <div className="flex justify-center items-center gap-3 mt-4">
              <button
                type="button"
                onClick={pauseRecording}
                className="btn-secondary py-2 px-5 text-xs rounded-xl font-semibold border-white/10 text-white/80 hover:text-white"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="btn-primary py-2 px-5 text-xs rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 border border-red-500/20 shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
              >
                ⏹️ Finish & Process
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-3xl">
                🎙️
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Record Your Lecture Directly</p>
              <p className="text-xs text-white/35 mt-1 max-w-[280px] mx-auto">
                EduMentor AI will transcribe, clean up, chunk, and embed your lecture in the course knowledge base.
              </p>
            </div>
            <button
              type="button"
              onClick={startRecording}
              className="btn-primary py-2.5 px-6 text-xs bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 border border-primary-500/20 shadow-lg"
            >
              ⏺️ Start Lecture Recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
