export default {
  id: 'headache',
  title: 'Headache',
  keywords: ['headache','migraine','SAH'],
  vitalsHints: ['Visual changes? worst-ever? neuro deficits?'],
  modifiers: [
    { id:'worst_ever', label:'Sudden, severe, worst-ever', effect:{ ctas: 2 } },
    { id:'neuro_deficit', label:'Headache with neuro deficit', effect:{ ctas: 2 } },
    { id:'migraine_typical', label:'Typical migraine, recurrent', effect:{ ctas: 5 } },
  ],
};