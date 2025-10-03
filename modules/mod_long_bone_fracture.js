export default {
  id: 'long_bone_fracture',
  title: 'Long Bone Injury / Fracture',
  keywords: ['fracture','long bone','deformity'],
  vitalsHints: ['NV status, bleeding, pain score'],
  modifiers: [
    { id:'open_fracture', label:'Open fracture / NV compromise', effect:{ ctas: 2 } },
    { id:'deformity_pain_high', label:'Deformity with severe pain', effect:{ ctas: 3 } },
    { id:'no_deformity_mild', label:'No deformity, mild pain', effect:{ ctas: 5 } },
  ],
};