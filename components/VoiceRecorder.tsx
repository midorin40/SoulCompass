import React, { useState, useRef } from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { UI_LABELS } from '../constants';

interface VoiceRecorderProps {
  onRecordingComplete: (base64: string, mimeType: string) => void;
  disabled?: boolean;
  lang?: 'ja' | 'en';
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, disabled, lang = 'ja' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const labels = UI_LABELS[lang];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64 = base64String.split(',')[1];
          onRecordingComplete(base64, 'audio/webm');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("マイクへのアクセスが許可されていません。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="relative">
      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={disabled}
          className={`p-3 rounded-xl transition-colors ${
            disabled 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
          title={labels.voiceBtn}
        >
          <Mic size={20} />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors animate-pulse"
          title={labels.stopBtn}
        >
          <StopCircle size={20} />
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;