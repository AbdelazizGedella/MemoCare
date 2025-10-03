export default {
  id: 'otitis_media',
  title: 'Ear Pain / Otitis Media',
  keywords: ['ear pain','otitis'],
  vitalsHints: ['Fever? perforation?'],
  modifiers: [
    { id:'mastoiditis_suspect', label:'Severe ear pain / mastoiditis concern', effect:{ ctas: 3 } },
    { id:'simple_otitis', label:'Simple otitis media', effect:{ ctas: 4 } },
  ],
};