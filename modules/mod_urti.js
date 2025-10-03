export default {
  id: 'urti',
  title: 'Upper Respiratory Tract Infection (URTI)',
  keywords: ['URTI','cold','flu'],
  vitalsHints: ['Fever? general appearance?'],
  modifiers: [
    { id:'urti_unwell', label:'URTI with fever and unwell look', effect:{ ctas: 3 } },
    { id:'urti_well', label:'URTI, appears well, no fever', effect:{ ctas: 5 } },
  ],
};