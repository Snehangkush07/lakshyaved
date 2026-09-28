import { useEffect, useState } from 'react';
import LakshyavedLogo from '../../ui/components/LakshyavedLogo';

export default function SplashScreen({ onComplete }) {
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Start fading out after 2 seconds
        const fadeTimer = setTimeout(() => {
            setIsFadingOut(true);
        }, 2000);

        // Call onComplete after fade out animation (0.5s)
        const completeTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 2500);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0f19] transition-opacity duration-500 ease-in-out ${
                isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
        >
            <div className="relative flex flex-col items-center">
                {/* Glowing background effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#10b981] rounded-full blur-[80px] opacity-25 animate-pulse"></div>
                
                {/* Logo Icon & Text */}
                <div className="animate-fade-up">
                    <LakshyavedLogo 
                        size={84} 
                        showText={true} 
                        showSubtitle={true} 
                        textClassName="text-4xl md:text-5xl font-black"
                        className="flex-col text-center" 
                    />
                </div>
                
                {/* Loading indicator */}
                <div className="mt-12 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>

            {/* Custom animations inside style tag for ease of use without tailwind config changes */}
            <style>{`
                @keyframes fade-up {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-up {
                    animation: fade-up 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
