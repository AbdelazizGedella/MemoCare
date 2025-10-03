export default {
  id: 'allergic_anaphylaxis',
  title: 'Allergic Reaction / Anaphylaxis',
  keywords: ['allergy','anaphylaxis','urticaria','swelling'],
  vitalsHints: ['Airway involvement? hypotension?'],
  modifiers: [
    { id:'anaphylaxis', label:'Anaphylaxis (airway / hypotension)', effect:{ ctas: 1 } },
    { id:'angioedema', label:'Angioedema without airway compromise', effect:{ ctas: 2 } },
    { id:'urticaria_only', label:'Urticaria only, stable', effect:{ ctas: 4 } },
  ],
};