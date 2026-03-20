import { useState, useEffect, useRef } from 'react'

interface Props {
  onUnlock: () => void
}

export default function PinLock({ onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [blockTimer, setBlockTimer] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (blocked && blockTimer > 0) {
      const timer = setTimeout(() => setBlockTimer(t => t - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (blocked && blockTimer === 0) {
      setBlocked(false)
      setAttempts(0)
      setError('')
    }
  }, [blocked, blockTimer])

  async function handleVerify() {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    const correct = await window.api.auth.verifyPin(pin)
    if (correct) {
      onUnlock()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setPin('')
      if (newAttempts >= 3) {
        setBlocked(true)
        setBlockTimer(30)
        setError('Too many wrong attempts. Wait 30 seconds.')
      } else {
        setError(`Wrong PIN. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} remaining.`)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVerify()
  }

  function handlePadPress(digit: string) {
    if (blocked) return
    if (digit === '⌫') {
      setPin(p => p.slice(0, -1))
    } else if (pin.length < 6) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length >= 4) setError('')
    }
  }

  return (
    <div className="min-h-screen bg-green-800 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl">🔒</span>
          </div>
          <h1 className="text-lg font-bold text-green-700">KAVS Wandoor</h1>
          <p className="text-xs text-gray-500 mt-1">Enter PIN to continue</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-4">
          {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length + 1 > 6 ? 6 : pin.length + 1)).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition ${
                i < pin.length
                  ? 'bg-green-700 border-green-700'
                  : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Hidden input for keyboard */}
        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={e => {
            if (!blocked) {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPin(val)
              if (val.length >= 4) setError('')
            }
          }}
          onKeyDown={handleKeyDown}
          className="sr-only"
        />

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        {/* Block timer */}
        {blocked && (
          <p className="text-sm text-orange-500 font-semibold mb-3">
            Try again in {blockTimer}s
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => (
            <button
              key={idx}
              onClick={() => key && handlePadPress(key)}
              disabled={blocked || key === ''}
              className={`h-12 rounded-xl text-lg font-semibold transition ${
                key === ''
                  ? 'invisible'
                  : key === '⌫'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  : 'bg-gray-100 text-gray-800 hover:bg-green-50 active:bg-green-100'
              } disabled:opacity-40`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleVerify}
          disabled={blocked || pin.length < 4}
          className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-40"
        >
          Unlock
        </button>
      </div>
    </div>
  )
}