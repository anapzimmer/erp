"use client";

import dynamic from 'next/dynamic';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface ErrorStateProps {
  title: string;
  message: string;
}

export default function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px'
    }}>
      <div style={{ width: '300px', height: '300px' }}>
        <DotLottieReact
          src="/animations/error-animation.json" // Aponta para o arquivo local
          loop
          autoplay
        />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}