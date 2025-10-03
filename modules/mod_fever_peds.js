export default {
  id: 'fever_peds',
  title: 'Fever (Pediatric)',
  keywords: ['fever','peds','child','infant'],
  vitalsHints: ['Age in months, appearance, hydration'],
  modifiers: [
    { id:'neonate', label:'Fever in neonate (<28 days)', effect:{ ctas: 2 } },
    { id:'ill_appearing', label:'Ill-appearing febrile child', effect:{ ctas: 3 } },
    { id:'well_appearing', label:'Well-appearing febrile child', effect:{ ctas: 4 } },
  ],
};