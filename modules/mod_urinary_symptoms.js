export default {
  id: 'urinary_symptoms',
  title: 'Urinary Symptoms',
  keywords: ['UTI','dysuria','frequency','retention'],
  vitalsHints: ['Fever? flank pain?'],
  modifiers: [
    { id:'retention', label:'Acute urinary retention', effect:{ ctas: 2 } },
    { id:'pyelo', label:'Fever + flank pain (pyelonephritis)', effect:{ ctas: 3 } },
    { id:'cystitis', label:'Dysuria/frequency no fever', effect:{ ctas: 5 } },
  ],
};