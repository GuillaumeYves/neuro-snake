let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency, duration, delay = 0, waveType = "square", volume = 0.08) {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + delay;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = waveType;
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

export function playAppleSound() {
  playTone(494, 0.07, 0.00);
  playTone(740, 0.07, 0.07);
}

export function playGoldenAppleSound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, index) => playTone(note, 0.1, index * 0.07, "square", 0.1));
  playTone(1047, 0.3, 0.28, "triangle", 0.05);
}

export function playGameOverSound() {
  const notes = [494, 392, 311, 196];
  notes.forEach((note, index) => playTone(note, 0.18, index * 0.13, "sawtooth", 0.09));
}

export function playBonusCollectSound() {
  playTone(330, 0.06, 0.00, "square", 0.09);
  playTone(440, 0.06, 0.06, "square", 0.09);
  playTone(660, 0.06, 0.12, "square", 0.09);
  playTone(880, 0.12, 0.18, "triangle", 0.08);
}
