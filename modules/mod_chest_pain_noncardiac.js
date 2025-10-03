export default {
  id: 'chest_pain_noncardiac',
  title: 'Chest Pain (Non-cardiac)',
  keywords: ['pleuritic','musculoskeletal','tearing'],
  vitalsHints: ['Rule out aortic features if tearing pain'],
  modifiers: [
    { id:'tearing', label:'Ripping/tearing chest pain', effect:{ ctas: 2 }, note:'Consider aortic dissection' },
    { id:'pleuritic', label:'Pleuritic chest pain / no distress', effect:{ ctas: 4 } },
    { id:'msk', label:'Musculoskeletal chest pain', effect:{ ctas: 5 } },
  ],
};