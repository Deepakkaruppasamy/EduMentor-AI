import React, { useRef, useState, useEffect } from 'react';

interface AudioRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSend = () => {
    if (audioBlob) onSend(audioBlob);
  };

  const handleCancel = () => {
    if (isRecording) stopRecording();
    onCancel();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors text-sm"
        title="Cancel"
      >
        ✕
      </button>

      {!audioBlob ? (
        <>
          {/* Recording state */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              title="Start recording"
            >
              🎙️
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-white/70 font-mono">{formatTime(duration)}</span>
                {/* Simple waveform visualization */}
                <div className="flex items-center gap-px flex-1 h-6">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-red-400/60"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animation: `bounceDot ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                title="Stop recording"
              >
                ⏹
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {/* Preview state */}
          <div className="flex-1 flex items-center gap-2">
            <audio src={audioUrl!} controls className="h-8 flex-1" style={{ maxWidth: 250 }} />
            <span className="text-xs text-white/40 font-mono">{formatTime(duration)}</span>
          </div>
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #4f5dc8, #6359a8)' }}
            title="Send"
          >
            ➤
          </button>
        </>
      )}
    </div>
  );
};
