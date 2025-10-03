export default {
  id: 'hyperglycemia',
  title: 'Hyperglycemia',
  keywords: ['hyperglycemia','high glucose','diabetes'],
  vitalsHints: ['Enter glucose and set hyperglycemia symptoms if present'],
  modifiers: [
    { id:'gt18_symptoms', label:'>18 mmol/L, symptomatic', effect:{ ctas: 2 } },
    { id:'gt18_asx', label:'>18 mmol/L, asymptomatic', effect:{ ctas: 3 } },
  ],
};