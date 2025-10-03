export default {
  id: 'laceration_puncture',
  title: 'Laceration / Puncture',
  keywords: ['laceration','cut','puncture'],
  vitalsHints: ['Bleeding control, NV status'],
  modifiers: [
    { id:'neurovasc', label:'Complex wound with neurovascular compromise', effect:{ ctas: 2 } },
    { id:'active_bleeding', label:'Active bleeding', effect:{ ctas: 3 } },
    { id:'sutures_required', label:'Sutures required', effect:{ ctas: 4 } },
    { id:'no_sutures', label:'No sutures required', effect:{ ctas: 5 } },
  ],
};