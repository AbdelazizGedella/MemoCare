export default {
  id: 'dental_pain',
  title: 'Dental Pain / Abscess',
  keywords: ['dental','tooth','abscess'],
  vitalsHints: ['Airway / facial swelling'],
  modifiers: [
    { id:'facial_swelling', label:'Dental infection with facial swelling', effect:{ ctas: 3 } },
    { id:'dental_pain_mild', label:'Dental pain, no swelling', effect:{ ctas: 5 } },
  ],
};