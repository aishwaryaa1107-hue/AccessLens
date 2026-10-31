export function speak(text: string, language = 'en-US') {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
  return true;
}
export function stopSpeaking() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
export function vibrate(pattern: number[]) { return typeof navigator.vibrate === 'function' ? navigator.vibrate(pattern) : false; }
