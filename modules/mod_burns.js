export default {
  id: 'burns',
  title: 'Burns',
  keywords: ['burn','scald','flame','electrical'],
  vitalsHints: ['TBSA, airway, location'],
  modifiers: [
    { id:'airway_burn', label:'Airway burn / inhalation injury', effect:{ ctas: 1 } },
    { id:'major_burn', label:'Major burn (e.g., >10% adult / hands/face)', effect:{ ctas: 2 } },
    { id:'minor_burn', label:'Minor burn', effect:{ ctas: 4 } },
  ],
};