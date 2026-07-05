import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'

const STEPS = [
  'Initialising billing engine…',
  'Loading clients & invoices…',
  'Preparing GST tables…',
  'Verifying invoice templates…',
  'Ready.',
]

/** Cinematic ~10s intro shown on every launch. Click "Skip intro" to dismiss. */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0) // 0 IIT card → 1 product title → 2 loading → 3 fade out
  const [step, setStep] = useState(0)

  useEffect(() => {
    const ts = [
      setTimeout(() => setPhase(1), 3000),
      setTimeout(() => setPhase(2), 6200),
      setTimeout(() => setPhase(3), 9700),
      setTimeout(onDone, 10500),
    ]
    return () => ts.forEach(clearTimeout)
  }, [onDone])

  useEffect(() => {
    if (phase !== 2) return
    const iv = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 700)
    return () => clearInterval(iv)
  }, [phase])

  const h = new Date().getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      className="app-chrome fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden text-center"
      style={{
        background: 'radial-gradient(1100px 620px at 50% 32%, #1d2433 0%, #0d1117 68%)',
        opacity: phase === 3 ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}
    >
      <style>{`
        @keyframes ycsUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @keyframes ycsFadeOut { to { opacity: 0; transform: translateY(-10px); visibility: hidden } }
        @keyframes ycsLine { from { width: 0 } to { width: 130px } }
        @keyframes ycsSpin { to { transform: rotate(360deg) } }
        @keyframes ycsGlow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .ycs-up { animation: ycsUp .9s cubic-bezier(.2,.7,.2,1) both }
        .ycs-out { animation: ycsFadeOut .6s ease both }
      `}</style>

      {/* faint engineering grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,123,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,123,42,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(700px 460px at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(700px 460px at 50% 40%, black, transparent)',
        }}
      />

      {/* phase 0 — institute card */}
      <div className={`absolute px-6 ${phase === 0 ? '' : 'ycs-out'}`}>
        <div className="ycs-up text-[11px] sm:text-xs font-medium tracking-[0.45em] text-neutral-400">
          INDIAN INSTITUTE OF TECHNOLOGY
        </div>
        <div className="ycs-up mt-2 text-4xl sm:text-5xl font-light tracking-[0.3em] text-white" style={{ animationDelay: '.35s' }}>
          MADRAS
        </div>
        <div className="mx-auto mt-5 h-px bg-gradient-to-r from-transparent via-[#c87b2a] to-transparent" style={{ animation: 'ycsLine 1.1s .8s ease both' }} />
        <div className="ycs-up mt-4 text-sm italic text-neutral-400" style={{ animationDelay: '1.2s' }}>
          Software Engineering &amp; Design Team presents
        </div>
      </div>

      {/* phase 1+ — product title */}
      {phase >= 1 && (
        <div className={`relative px-6 ${phase >= 3 ? 'ycs-out' : ''}`}>
          <div className="ycs-up relative mx-auto mb-6 h-24 w-24">
            <div
              className="absolute -inset-2 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0 300deg, #c87b2a 330deg, transparent 360deg)',
                animation: 'ycsSpin 2.6s linear infinite',
              }}
            />
            <div className="absolute inset-0 grid place-items-center rounded-full border border-white/10 bg-[#141a24]">
              <img src={logo} alt="YouthClub" className="h-16 w-16 object-contain" />
            </div>
          </div>
          <div className="ycs-up text-4xl sm:text-5xl font-black tracking-tight text-white" style={{ animationDelay: '.2s' }}>
            YouthClub
          </div>
          <div className="ycs-up mt-2 text-sm sm:text-base font-semibold tracking-[0.5em] text-[#db923f]" style={{ animationDelay: '.45s' }}>
            INVOICE SOFTWARE
          </div>
          <div className="ycs-up mt-5 text-sm text-neutral-300" style={{ animationDelay: '.75s' }}>
            Crafted for <span className="font-semibold text-white">Mr. Sarvesh Ji</span> · Securities Services
          </div>
          <div className="ycs-up mt-1.5 text-sm italic text-neutral-500" style={{ animationDelay: '1s' }}>
            {greet}, Sarvesh Ji — welcome back.
          </div>

          {/* phase 2 — loading */}
          <div className="mx-auto mt-9 h-12 w-72 sm:w-80" style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity .5s' }}>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8f4d1c] via-[#c87b2a] to-[#e6b273]"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width .65s ease' }}
              />
            </div>
            <div className="mt-3 font-mono text-[11px] text-neutral-500" style={{ animation: 'ycsGlow 1.4s ease infinite' }}>
              {STEPS[step]}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onDone}
        className="absolute bottom-6 right-6 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-white/30 hover:text-white cursor-pointer"
      >
        Skip intro →
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-neutral-500">
        Designed &amp; built by <span className="font-semibold text-neutral-300">मुंशी Munshi Labs</span> · IIT Madras
      </div>
    </div>
  )
}
