export default {
  id: 'gi_bleed',
  title: 'GI Bleeding',
  keywords: ['GI bleed','hematemesis','melena','hematochezia'],
  vitalsHints: ['Hemodynamics, Hb if known'],
  modifiers: [
    { id:'unstable', label:'GI bleed with instability', effect:{ ctas: 1 } },
    { id:'active_bleed', label:'Active GI bleeding, stable', effect:{ ctas: 2 } },
    { id:'occult', label:'Occult blood / minor bleed', effect:{ ctas: 3 } },
  ],
};