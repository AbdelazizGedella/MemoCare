export default {
  id: 'abdominal_pain',
  title: 'Abdominal Pain',
  keywords: ['abdominal pain','abd pain','stomach pain'],
  vitalsHints: ['Central vs peripheral; acute vs chronic; peritonitis signs?'],
  modifiers: [
    { id:'acute_severe', label:'Acute severe central pain', effect:{ ctas: 2 } },
    { id:'acute_moderate', label:'Acute moderate central pain', effect:{ ctas: 3 } },
    { id:'mild_chronic', label:'Chronic, mild abdominal pain', effect:{ ctas: 5 } },
  ],
};