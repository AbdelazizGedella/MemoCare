export default {
  id: 'shortness_of_breath',
  title: 'Shortness of Breath',
  keywords: ['SOB','dyspnea','asthma','COPD'],
  vitalsHints: ['SpO₂: <90% → 1, <92% → 2, ≤94% → 3'],
  modifiers: [
    { id:'severe_distress', label:'Severe respiratory distress', effect:{ ctas: 1 } },
    { id:'asthma_severe', label:'Asthma with FEV₁/PEFR <40% predicted', effect:{ ctas: 2 } },
    { id:'asthma_moderate', label:'Asthma 40–60%', effect:{ ctas: 3 } },
    { id:'asthma_mild', label:'Asthma >60%', effect:{ ctas: 4 } },
    { id:'sob_no_distress', label:'Short of breath, no distress', effect:{ ctas: 4 } },
  ],
};