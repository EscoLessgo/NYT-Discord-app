import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';

export const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            {/* Animated Snow Globe */}
            <div className="mb-8 animate-bounce">
                <div className="relative w-48 h-48">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-50 blur-xl animate-pulse"></div>
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-300 via-blue-400 to-cyan-500 flex items-center justify-center overflow-hidden border-4 border-cyan-200/30">
                        {/* Pineapple icon placeholder */}
                        <div className="text-6xl animate-spin-slow">🍍</div>
                    </div>
                </div>
            </div>

            {/* Loading Text */}
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent animate-pulse">
                NYT Spelling Bee
            </h1>

            <p className="text-lg text-gray-400 mb-8 animate-pulse">
                Loading your daily puzzle...
            </p>

            {/* Progress Bar */}
            <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Progress Percentage */}
            <p className="text-sm text-gray-500 mt-4">{progress}%</p>

            {/* Music Note Animation */}

        </div>
    );
};
