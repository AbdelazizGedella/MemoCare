export default {
  id: 'hypothermia',
  title: 'Hypothermia',
  keywords: ['hypothermia','cold'],
  vitalsHints: ['Core temperature'],
  modifiers: [
    { id:'severe', label:'Severe hypothermia', effect:{ ctas: 1 } },
    { id:'moderate', label:'Moderate hypothermia', effect:{ ctas: 2 } },
    { id:'mild', label:'Mild hypothermia', effect:{ ctas: 3 } },
  ],
};