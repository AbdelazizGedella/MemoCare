export default {
  id: 'constipation',
  title: 'Constipation',
  keywords: ['constipation','hard stool'],
  vitalsHints: ['Abdominal pain? vomiting?'],
  modifiers: [
    { id:'obstruction_suspect', label:'Constipation with obstruction concern', effect:{ ctas: 3 } },
    { id:'simple', label:'Simple constipation', effect:{ ctas: 5 } },
  ],
};