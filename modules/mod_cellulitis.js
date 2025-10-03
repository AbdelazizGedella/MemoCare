export default {
  id: 'cellulitis',
  title: 'Cellulitis',
  keywords: ['cellulitis','skin infection'],
  vitalsHints: ['Fever, spreading, location'],
  modifiers: [
    { id:'systemic_toxic', label:'Toxic/systemic signs', effect:{ ctas: 2 } },
    { id:'significant', label:'Significant cellulitis', effect:{ ctas: 3 } },
    { id:'localized', label:'Localized mild cellulitis', effect:{ ctas: 4 } },
  ],
};