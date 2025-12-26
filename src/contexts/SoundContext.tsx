import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface SoundContextType {
    volume: number;
    setVolume: (volume: number) => void;
    playClick: () => void;
    playSuccess: () => void;
    playError: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [volume, setVolume] = useState(0.55);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        }

        // Auto-play checks for AudioContext only (music removed)
        const handleInteraction = async () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            document.removeEventListener('mousedown', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };

        document.addEventListener('mousedown', handleInteraction);
        document.addEventListener('keydown', handleInteraction);

        return () => {
            document.removeEventListener('mousedown', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, []);

    const playTone = (frequency: number, type: OscillatorType, duration: number) => {
        if (!audioContextRef.current) return;

        // Resume context if suspended (browser policy)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const osc = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

        gainNode.gain.setValueAtTime(volume * 0.1, audioContextRef.current.currentTime); // Scale down a bit
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        osc.start();
        osc.stop(audioContextRef.current.currentTime + duration);
    };

    const playClick = () => {
        // High pitched short blip
        playTone(800, 'sine', 0.1);
    };

    const playSuccess = () => {
        // Nice major chord arpeggio-ish
        setTimeout(() => playTone(600, 'sine', 0.2), 0);
        setTimeout(() => playTone(800, 'sine', 0.2), 100);
        setTimeout(() => playTone(1200, 'sine', 0.4), 200);
    };

    const playError = () => {
        // Low buzzer
        playTone(150, 'sawtooth', 0.3);
    };

    return (
        <SoundContext.Provider value={{ volume, setVolume, playClick, playSuccess, playError }}>
            {children}
        </SoundContext.Provider>
    );
};
