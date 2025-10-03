export default {
  id: 'seizure',
  title: 'Seizure / Post-ictal',
  keywords: ['seizure','post-ictal','status'],
  vitalsHints: ['Airway, glucose, GCS'],
  modifiers: [
    { id:'status', label:'Status epilepticus / ongoing seizure', effect:{ ctas: 1 } },
    { id:'postictal_low_gcs', label:'Post-ictal with low GCS', effect:{ ctas: 2 } },
    { id:'first_seizure_well', label:'First seizure, now well', effect:{ ctas: 3 } },
    { id:'known_epilepsy_well', label:'Known epilepsy, now well', effect:{ ctas: 4 } },
  ],
};