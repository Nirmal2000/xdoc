"use client"

import { useState, useRef } from 'react';
import { toast } from "sonner";

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcripts, setTranscripts] = useState({});

  // Voice recording refs
  const socket = useRef(null);
  const audioContext = useRef(null);
  const mediaStream = useRef(null);
  const scriptProcessor = useRef(null);

  const getToken = async () => {
    try {
      const response = await fetch('/api/assemblyai/token');
      const data = await response.json();

      if (!data || !data.token) {
        toast.error('Failed to get AssemblyAI token. Please check your API key.');
        return null;
      }

      return data.token;
    } catch (error) {
      console.error('Error fetching token:', error);
      toast.error('Network error while getting token. Please check your connection.');
      return null;
    }
  };

  const startRecording = async () => {
    setIsStarting(true);
    const token = await getToken();
    if (!token) { setIsStarting(false); return; }

    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&token=${token}`;
    socket.current = new WebSocket(wsUrl);

    const turns = {}; // for storing transcript updates per turn

    socket.current.onopen = async () => {
      console.log('WebSocket connection established');

      try {
        mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext.current = new AudioContext({ sampleRate: 16000 });
        setIsRecording(true);
        setIsStarting(false);
        toast.success('Recording started... Speak now!');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Microphone access denied. Please allow microphone permissions and try again.');
        stopRecording();
        return;
      }

      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      scriptProcessor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      source.connect(scriptProcessor.current);
      scriptProcessor.current.connect(audioContext.current.destination);

      scriptProcessor.current.onaudioprocess = (event) => {
        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;

        const input = event.inputBuffer.getChannelData(0);
        const buffer = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          buffer[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
        }
        socket.current.send(buffer.buffer);
      };
    };

    socket.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'Turn') {
        const { turn_order, transcript } = message;
        turns[turn_order] = transcript;

        const ordered = Object.keys(turns)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => turns[k])
          .join(' ');

        setTranscripts({ ...turns });
      }
    };

    socket.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      toast.error('Connection to speech recognition service failed. Please try again.');
      setIsStarting(false);
      stopRecording();
    };

    socket.current.onclose = () => {
      console.log('WebSocket closed');
      setIsStarting(false);
      socket.current = null;
    };
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsStarting(false);
    toast.info('Recording stopped');

    if (scriptProcessor.current) {
      scriptProcessor.current.disconnect();
      scriptProcessor.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    if (socket.current) {
      socket.current.send(JSON.stringify({ type: 'Terminate' }));
      socket.current.close();
      socket.current = null;
    }
  };

  const getTranscriptText = () => {
    return Object.keys(transcripts)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => transcripts[k])
      .join(' ');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return {
    isRecording,
    isStarting,
    transcripts,
    toggleRecording,
    getTranscriptText,
  };
}
