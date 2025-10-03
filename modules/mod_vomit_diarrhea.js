export default {
  id: 'vomit_diarrhea',
  title: 'Vomiting / Diarrhea',
  keywords: ['vomiting','diarrhea','gastro'],
  vitalsHints: ['Dehydration? fever?'],
  modifiers: [
    { id:'severe_dehydration', label:'Severe dehydration / persistent vomiting', effect:{ ctas: 2 } },
    { id:'moderate_dehydration', label:'Moderate dehydration', effect:{ ctas: 3 } },
    { id:'mild', label:'Mild symptoms, tolerating PO', effect:{ ctas: 5 } },
  ],
};