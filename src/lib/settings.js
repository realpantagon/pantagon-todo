export const DEFAULT_SETTINGS = {
  notificationsEnabled: false,
  soundEnabled: true,
  theme: 'dark',
}

// Custom synthesizer ding sound using Web Audio API
export function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    osc1.type = 'sine'
    // Starts at D5, ramps up to A5 for a bright, upward sound
    osc1.frequency.setValueAtTime(587.33, now) 
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.08)
    
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880.00, now)
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08) // D6
    
    gainNode.gain.setValueAtTime(0.08, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    
    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.45)
    osc2.stop(now + 0.45)
  } catch (e) {
    console.error('Web Audio API is not supported or blocked:', e)
  }
}
