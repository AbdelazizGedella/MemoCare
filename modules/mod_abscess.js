export default {
  id: 'abscess',
  title: 'Abscess',
  keywords: ['abscess','boil'],
  vitalsHints: ['Fluctuance, location, fever'],
  modifiers: [
    { id:'systemic', label:'Abscess with systemic features', effect:{ ctas: 3 } },
    { id:'simple', label:'Simple localized abscess', effect:{ ctas: 4 } },
  ],
};