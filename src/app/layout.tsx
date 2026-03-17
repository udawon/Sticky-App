'use client'

import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    // Progress bar animation over 3 seconds
    const startTime = Date.now()
    const duration = 3000
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(interval)
    }, 30)

    // Phase transitions for text
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 1800)

    // Redirect after 3s
    const t3 = setTimeout(() => {
      window.location.href = 'https://sticky-office.vercel.app/'
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <html lang="ko">
      <head>
        <meta httpEquiv="refresh" content="3;url=https://sticky-office.vercel.app/" />
        <title>사무실 이전 안내</title>
        <meta name="description" content="Sticky Office로 이전했습니다." />
      </head>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes truckDrive {
            0% { transform: translateX(-300px); }
            60% { transform: translateX(0px); }
            70% { transform: translateX(-5px); }
            80% { transform: translateX(5px); }
            85% { transform: translateX(-3px); }
            90% { transform: translateX(3px); }
            100% { transform: translateX(0px); }
          }

          @keyframes bounce1 {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-18px) rotate(5deg); }
          }

          @keyframes bounce2 {
            0%, 100% { transform: translateY(0) rotate(3deg); }
            50% { transform: translateY(-14px) rotate(-3deg); }
          }

          @keyframes bounce3 {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-22px) rotate(4deg); }
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-3deg); }
            75% { transform: rotate(3deg); }
          }

          @keyframes sparkle {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }

          @keyframes smoke {
            0% { opacity: 0.6; transform: translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-30px, -15px) scale(2); }
          }

          @keyframes progressGlow {
            0%, 100% { box-shadow: 0 0 8px rgba(251, 191, 36, 0.3); }
            50% { box-shadow: 0 0 16px rgba(251, 191, 36, 0.6); }
          }
        `}} />

        <div style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
        }}>
          {/* Bouncing boxes */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '24px',
            height: '60px',
            alignItems: 'flex-end',
          }}>
            <span style={{
              fontSize: '2rem',
              animation: 'bounce1 0.8s ease-in-out infinite',
              display: 'inline-block',
            }}>📦</span>
            <span style={{
              fontSize: '1.6rem',
              animation: 'bounce2 0.9s ease-in-out infinite 0.15s',
              display: 'inline-block',
            }}>📦</span>
            <span style={{
              fontSize: '2.4rem',
              animation: 'bounce3 0.7s ease-in-out infinite 0.3s',
              display: 'inline-block',
            }}>📦</span>
            <span style={{
              fontSize: '1.4rem',
              animation: 'bounce1 1s ease-in-out infinite 0.1s',
              display: 'inline-block',
            }}>📦</span>
          </div>

          {/* Truck animation */}
          <div style={{
            fontSize: '3.5rem',
            marginBottom: '32px',
            animation: 'truckDrive 1.5s ease-out forwards',
            position: 'relative',
            display: 'inline-block',
          }}>
            <span style={{
              position: 'absolute',
              left: '-20px',
              top: '-8px',
              fontSize: '1rem',
              animation: 'smoke 1s ease-out infinite',
              opacity: 0.4,
            }}>💨</span>
            <span style={{ animation: 'wiggle 0.3s ease-in-out infinite', display: 'inline-block' }}>🚚</span>
          </div>

          {/* Phase text animations */}
          <div style={{ minHeight: '100px', marginBottom: '28px' }}>
            <p style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              margin: '0 0 12px 0',
              opacity: phase >= 0 ? 1 : 0,
              animation: 'fadeInUp 0.5s ease-out forwards',
              color: '#fbbf24',
            }}>
              짐 다 쌌어요! 🎉
            </p>

            {phase >= 1 && (
              <p style={{
                fontSize: '1.1rem',
                margin: '0 0 16px 0',
                opacity: 0.8,
                animation: 'fadeInUp 0.5s ease-out forwards',
                color: '#d4d4d8',
              }}>
                새 사무실로 이동 중...
              </p>
            )}

            {phase >= 2 && (
              <a
                href="https://sticky-office.vercel.app/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#fbbf24',
                  textDecoration: 'none',
                  animation: 'fadeInUp 0.5s ease-out forwards',
                  padding: '8px 20px',
                  borderRadius: '12px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ animation: 'sparkle 1.5s ease-in-out infinite', display: 'inline-block' }}>🏢</span>
                <span>Sticky Office</span>
                <span style={{ animation: 'sparkle 1.5s ease-in-out infinite 0.3s', display: 'inline-block' }}>✨</span>
              </a>
            )}
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            maxWidth: '280px',
            margin: '0 auto',
          }}>
            <div style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '3px',
              overflow: 'hidden',
              animation: 'progressGlow 2s ease-in-out infinite',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                borderRadius: '3px',
                transition: 'width 0.05s linear',
              }} />
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: '#71717a',
              marginTop: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              이사 진행률 {Math.round(progress)}%
            </p>
          </div>
        </div>

        {/* Hide app children — this is a redirect-only page */}
        <div style={{ display: 'none' }}>{children}</div>
      </body>
    </html>
  )
}
