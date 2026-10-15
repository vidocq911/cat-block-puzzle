let gameAudioContext = null;
function playSound(kind = 'tap') {
  if (!state.settings || !state.settings.sound) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  const notes = {
    tap: [[520, 0, .05, 'sine']],
    feed: [[620, 0, .075, 'triangle'], [820, .065, .095, 'triangle']],
    happy: [[523, 0, .075, 'sine'], [659, .06, .075, 'sine'], [784, .12, .12, 'triangle']],
    success: [[587, 0, .08, 'triangle'], [740, .065, .08, 'triangle'], [880, .13, .14, 'triangle']],
    clear: [[660, 0, .07, 'triangle'], [784, .06, .07, 'triangle'], [988, .12, .16, 'triangle']],
    clean: [[740, 0, .06, 'sine'], [988, .055, .1, 'sine']],
    error: [[260, 0, .13, 'sawtooth', 170]]
  };
  try {
    if (!gameAudioContext) gameAudioContext = new AudioCtor();
    if (gameAudioContext.state === 'suspended') gameAudioContext.resume();
    const now = gameAudioContext.currentTime;
    (notes[kind] || notes.tap).forEach(([frequency, delay, duration, wave, endFrequency]) => {
      const start = now + delay;
      const oscillator = gameAudioContext.createOscillator();
      const gain = gameAudioContext.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(.06, start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(gameAudioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .02);
    });
  } catch {}
}
