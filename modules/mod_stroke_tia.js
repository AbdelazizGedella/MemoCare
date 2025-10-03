export default {
  id: 'stroke_tia',
  title: 'Stroke / TIA',
  keywords: ['stroke','TIA','FAST','weakness','aphasia'],
  vitalsHints: ['Onset time? glucose? BP?'],
  modifiers: [
    { id:'major_deficit', label:'Major focal deficit <6h', effect:{ ctas: 2 } },
    { id:'minor_deficit', label:'Minor focal deficit', effect:{ ctas: 3 } },
    { id:'resolved_tia', label:'Resolved TIA', effect:{ ctas: 4 } },
  ],
};