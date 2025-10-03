export default {
  id: 'sinusitis',
  title: 'Sinusitis',
  keywords: ['sinus','sinusitis','facial pain'],
  vitalsHints: ['Fever? duration?'],
  modifiers: [
    { id:'orbital_complication', label:'Sinusitis with orbital complications', effect:{ ctas: 2 } },
    { id:'moderate', label:'Moderate sinusitis symptoms', effect:{ ctas: 4 } },
    { id:'mild', label:'Mild sinus symptoms', effect:{ ctas: 5 } },
  ],
};