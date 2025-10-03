export default {
  id: 'palpitations',
  title: 'Palpitations / Arrhythmia',
  keywords: ['palpitations','arrhythmia','SVT','AF'],
  vitalsHints: ['ECG, hemodynamics'],
  modifiers: [
    { id:'unstable', label:'Palpitations with instability', effect:{ ctas: 1 } },
    { id:'fast_irregular', label:'Rapid irregular or SVT stable', effect:{ ctas: 2 } },
    { id:'benign', label:'Benign palpitations / anxiety', effect:{ ctas: 4 } },
  ],
};