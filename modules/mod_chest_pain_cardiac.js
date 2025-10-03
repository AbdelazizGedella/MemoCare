export default {
  id: 'chest_pain_cardiac',
  title: 'Chest Pain (Cardiac Features)',
  keywords: ['chest pain','cardiac','ACS','angina','MI'],
  vitalsHints: ['ECG <10 min','SpO₂, BP, HR'],
  modifiers: [
    { id:'cardiac_features', label:'Chest pain with cardiac features', effect:{ ctas: 2 } },
    { id:'ischemia_signs', label:'Ischemia on ECG / ongoing severe pain', effect:{ ctas: 2 } },
  ],
};