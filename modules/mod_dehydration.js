export default {
  id: 'dehydration',
  title: 'Dehydration',
  keywords: ['dehydration','dry','low intake'],
  vitalsHints: ['Mucous membranes, orthostatics'],
  modifiers: [
    { id:'severe', label:'Severe dehydration', effect:{ ctas: 2 } },
    { id:'moderate', label:'Moderate dehydration', effect:{ ctas: 3 } },
    { id:'mild', label:'Mild dehydration', effect:{ ctas: 4 } },
  ],
};