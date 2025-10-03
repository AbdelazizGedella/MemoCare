export default {
  id: 'pneumonia',
  title: 'Pneumonia',
  keywords: ['pneumonia','chest infection','cough','fever'],
  vitalsHints: ['SpO₂, RR, fever'],
  modifiers: [
    { id:'hypoxic', label:'Suspected pneumonia with hypoxia', effect:{ ctas: 2 } },
    { id:'fever_tachypnea', label:'Fever + tachypnea', effect:{ ctas: 3 } },
    { id:'cough_well', label:'Cough, otherwise well', effect:{ ctas: 4 } },
  ],
};