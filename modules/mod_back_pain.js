export default {
  id: 'back_pain',
  title: 'Back Pain',
  keywords: ['back pain','low back','sciatica'],
  vitalsHints: ['Red flags: retention, saddle anesthesia, fever, IVDA'],
  modifiers: [
    { id:'cauda_red_flags', label:'Back pain with red flags (cauda / infection)', effect:{ ctas: 2 } },
    { id:'moderate', label:'Moderate acute back pain', effect:{ ctas: 4 } },
    { id:'chronic_mild', label:'Chronic mild back pain', effect:{ ctas: 5 } },
  ],
};