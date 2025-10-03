export default {
  id: 'renal_colic',
  title: 'Renal Colic',
  keywords: ['renal colic','stone','flank pain'],
  vitalsHints: ['Pain, vomiting, fever?'],
  modifiers: [
    { id:'stone_with_fever', label:'Stone with fever / obstruction concern', effect:{ ctas: 2 } },
    { id:'severe_pain', label:'Severe flank pain / vomiting', effect:{ ctas: 3 } },
    { id:'mild_pain', label:'Mild flank pain', effect:{ ctas: 4 } },
  ],
};