export default {
  id: 'heat_stroke',
  title: 'Heat Illness / Stroke',
  keywords: ['heat stroke','heat exhaustion'],
  vitalsHints: ['Temp, CNS status, hydration'],
  modifiers: [
    { id:'heat_stroke', label:'Heat stroke (CNS changes)', effect:{ ctas: 1 } },
    { id:'heat_exhaustion', label:'Heat exhaustion', effect:{ ctas: 3 } },
    { id:'heat_cramps', label:'Heat cramps', effect:{ ctas: 5 } },
  ],
};