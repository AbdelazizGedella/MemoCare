export default {
  id: 'pharyngitis',
  title: 'Sore Throat / Pharyngitis',
  keywords: ['pharyngitis','sore throat','tonsillitis'],
  vitalsHints: ['Airway, swallowing, fever'],
  modifiers: [
    { id:'airway_concern', label:'Airway compromise / drooling', effect:{ ctas: 2 } },
    { id:'fever_pain', label:'Fever + severe throat pain', effect:{ ctas: 3 } },
    { id:'mild', label:'Mild sore throat', effect:{ ctas: 5 } },
  ],
};