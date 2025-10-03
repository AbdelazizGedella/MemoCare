export default {
  id: 'epistaxis',
  title: 'Epistaxis',
  keywords: ['nosebleed','epistaxis'],
  vitalsHints: ['Direct pressure, review anticoagulants'],
  modifiers: [
    { id:'uncontrolled', label:'Uncontrolled epistaxis despite pressure', effect:{ ctas: 2 } },
    { id:'controlled_pressure', label:'Bleeding controlled with pressure', effect:{ ctas: 3 } },
    { id:'clotting_disorder', label:'Coagulopathy / on anticoagulants', effect:{ ctas: 3 } },
    { id:'no_active_bleeding', label:'Acute epistaxis, no active bleeding', effect:{ ctas: 4 } },
    { id:'periodic', label:'Periodic/recurrent, no active bleeding', effect:{ ctas: 5 } },
  ],
};