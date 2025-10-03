export default {
  id: 'fever_adult',
  title: 'Fever (Adult)',
  keywords: ['fever','pyrexia','infection'],
  vitalsHints: ['Temp, immunocompromise, general appearance'],
  modifiers: [
    { id:'septic_look', label:'Fever with septic/unwell look', effect:{ ctas: 2 } },
    { id:'fever_unwell', label:'Fever, looks unwell', effect:{ ctas: 3 } },
    { id:'fever_well', label:'Fever, looks well', effect:{ ctas: 4 } },
  ],
};