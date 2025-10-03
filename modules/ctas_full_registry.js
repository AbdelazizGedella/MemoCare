// CTAS Full Registry (single-file)
// Drop-in replacement for: /modules/index.js
// Exports: default array of module specs { id, title, keywords, vitalsHints, modifiers:[{id,label,effect:{ctas},note?}] }

export default [
  // ==== Cardiac / Chest Pain ====
  {
    id: 'chest_pain_cardiac',
    title: 'Chest Pain (Cardiac Features)',
    keywords: ['chest pain','cardiac','ACS','angina','MI'],
    vitalsHints: ['ECG <10 min','SpO₂, BP, HR'],
    modifiers: [
      { id:'cardiac_features', label:'Chest pain with cardiac features', effect:{ ctas: 2 } },
      { id:'ischemia_signs', label:'Ischemia on ECG / ongoing severe pain', effect:{ ctas: 2 } },
      { id:'cardiac_mild', label:'Atypical, low-risk, pain controlled', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'chest_pain_noncardiac',
    title: 'Chest Pain (Non-cardiac)',
    keywords: ['pleuritic','musculoskeletal','tearing','aortic'],
    vitalsHints: ['Rule out aortic features if tearing pain'],
    modifiers: [
      { id:'tearing', label:'Ripping/tearing chest pain (aortic concern)', effect:{ ctas: 2 } },
      { id:'pleuritic', label:'Pleuritic chest pain / no distress', effect:{ ctas: 4 } },
      { id:'msk', label:'Musculoskeletal chest pain', effect:{ ctas: 5 } },
    ],
  },

  // ==== Respiratory ====
  {
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
  },
  {
    id: 'cough_simple',
    title: 'Cough',
    keywords: ['cough','URTI','bronchitis'],
    vitalsHints: ['SpO₂, RR, fever, general appearance'],
    modifiers: [
      { id:'resp_distress_or_hypoxia', label:'Respiratory distress or hypoxia', effect:{ ctas: 2 } },
      { id:'fever_tachypnea', label:'Fever with tachypnea', effect:{ ctas: 3 } },
      { id:'well_mild', label:'Well-appearing, mild cough', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'pneumonia',
    title: 'Pneumonia',
    keywords: ['pneumonia','chest infection','cough','fever'],
    vitalsHints: ['SpO₂, RR, fever'],
    modifiers: [
      { id:'hypoxic', label:'Suspected pneumonia with hypoxia', effect:{ ctas: 2 } },
      { id:'fever_tachypnea', label:'Fever + tachypnea', effect:{ ctas: 3 } },
      { id:'cough_well', label:'Cough, otherwise well', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'flu_like',
    title: 'Flu / Influenza-like Illness',
    keywords: ['flu','influenza','viral'],
    vitalsHints: ['SpO₂, RR, dehydration, risk factors'],
    modifiers: [
      { id:'distress_or_hypoxia', label:'Respiratory distress / hypoxia', effect:{ ctas: 2 } },
      { id:'unwell_moderate', label:'Unwell with persistent fever/myalgia', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild flu-like symptoms, stable', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'urti',
    title: 'Upper Respiratory Tract Infection (URTI)',
    keywords: ['URTI','cold','flu'],
    vitalsHints: ['Fever? general appearance?'],
    modifiers: [
      { id:'urti_unwell', label:'URTI with fever and unwell look', effect:{ ctas: 3 } },
      { id:'urti_well', label:'URTI, appears well, no fever', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'pharyngitis',
    title: 'Sore Throat / Pharyngitis',
    keywords: ['pharyngitis','sore throat','tonsillitis'],
    vitalsHints: ['Airway, swallowing, fever'],
    modifiers: [
      { id:'airway_concern', label:'Airway compromise / drooling', effect:{ ctas: 2 } },
      { id:'fever_pain', label:'Fever + severe throat pain', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild sore throat', effect:{ ctas: 5 } },
    ],
  },

  // ==== Neuro ====
  {
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
  },
  {
    id: 'stroke_tia',
    title: 'Stroke / TIA',
    keywords: ['stroke','TIA','FAST','weakness','aphasia'],
    vitalsHints: ['Onset time? glucose? BP?'],
    modifiers: [
      { id:'major_deficit', label:'Major focal deficit <6h', effect:{ ctas: 2 } },
      { id:'minor_deficit', label:'Minor focal deficit', effect:{ ctas: 3 } },
      { id:'resolved_tia', label:'Resolved TIA', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'simple_headache',
    title: 'Headache',
    keywords: ['headache','migraine','SAH'],
    vitalsHints: ['Worst-ever? neuro deficit? fever?'],
    modifiers: [
      { id:'red_flags', label:'Worst-ever / neuro deficit / meningism', effect:{ ctas: 2 } },
      { id:'moderate_new', label:'Moderate new-onset headache', effect:{ ctas: 3 } },
      { id:'typical_migraine', label:'Typical recurrent migraine', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'dizziness',
    title: 'Dizziness',
    keywords: ['dizziness','vertigo','lightheaded'],
    vitalsHints: ['Neuro exam, gait, BP, arrhythmia risk'],
    modifiers: [
      { id:'neuro_deficit_or_syncope', label:'Neuro deficit or syncope with instability', effect:{ ctas: 2 } },
      { id:'unsteady_significant', label:'Significant unsteadiness / persistent vomiting', effect:{ ctas: 3 } },
      { id:'bppv_like', label:'Benign positional vertigo–like', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'dizziness_headache',
    title: 'Dizziness & Headache',
    keywords: ['dizziness','headache'],
    vitalsHints: ['Stroke screen, GCS, BP, neuro exam'],
    modifiers: [
      { id:'stroke_flags', label:'Stroke red flags / neuro deficit', effect:{ ctas: 2 } },
      { id:'moderate_symptoms', label:'Moderate symptoms, unsteady', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild symptoms, typical pattern', effect:{ ctas: 4 } },
    ],
  },

  // ==== GI ====
  {
    id: 'abdominal_pain',
    title: 'Abdominal Pain',
    keywords: ['abdominal pain','abd pain'],
    vitalsHints: ['Central vs peripheral, peritonitis, onset'],
    modifiers: [
      { id:'acute_severe_central', label:'Acute severe central pain / peritonitis', effect:{ ctas: 2 } },
      { id:'acute_moderate', label:'Acute moderate pain', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild pain', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'abdominal_pain_fever',
    title: 'Abdominal Pain with Fever',
    keywords: ['abdominal pain','fever','appendicitis','cholecystitis'],
    vitalsHints: ['Pain severity/location, peritonitis signs, vitals'],
    modifiers: [
      { id:'peritonitis_or_instability', label:'Peritonitis / hemodynamic compromise', effect:{ ctas: 2 } },
      { id:'acute_moderate_fever', label:'Acute moderate pain with fever', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild abdominal pain with low-grade fever', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'stomach_discomfort',
    title: 'Stomach Discomfort',
    keywords: ['stomach discomfort','dyspepsia','epigastric'],
    vitalsHints: ['Pain severity, chest-pain red flags'],
    modifiers: [
      { id:'red_flags', label:'Severe pain / GI bleed / ACS concern', effect:{ ctas: 2 } },
      { id:'moderate', label:'Moderate persistent discomfort', effect:{ ctas: 4 } },
      { id:'mild', label:'Mild dyspepsia, stable', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'nausea_vomiting_fever',
    title: 'Nausea, Vomiting & Fever',
    keywords: ['nausea','vomiting','fever','gastroenteritis'],
    vitalsHints: ['Hydration status, temperature, pain, immunocompromise'],
    modifiers: [
      { id:'sepsis_or_immuno', label:'Septic look or immunocompromised with fever', effect:{ ctas: 2 } },
      { id:'severe_dehydration', label:'Severe dehydration or persistent vomiting', effect:{ ctas: 2 } },
      { id:'moderate_dehydration', label:'Moderate dehydration / unable to tolerate PO', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild symptoms, tolerating PO', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'nausea_vomiting_only',
    title: 'Nausea & Vomiting',
    keywords: ['nausea','vomiting','gastro'],
    vitalsHints: ['Hydration, pregnancy status (if relevant)'],
    modifiers: [
      { id:'severe_dehydration', label:'Severe dehydration / persistent vomiting', effect:{ ctas: 2 } },
      { id:'moderate_dehydration', label:'Moderate dehydration', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild symptoms, tolerating PO', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'vomit_diarrhea',
    title: 'Vomiting / Diarrhea',
    keywords: ['vomiting','diarrhea','gastro'],
    vitalsHints: ['Dehydration? fever?'],
    modifiers: [
      { id:'severe_dehydration', label:'Severe dehydration / persistent vomiting', effect:{ ctas: 2 } },
      { id:'moderate_dehydration', label:'Moderate dehydration', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild symptoms, tolerating PO', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'gi_bleed',
    title: 'GI Bleeding',
    keywords: ['GI bleed','hematemesis','melena','hematochezia'],
    vitalsHints: ['Hemodynamics, Hb if known'],
    modifiers: [
      { id:'unstable', label:'GI bleed with instability', effect:{ ctas: 1 } },
      { id:'active_bleed', label:'Active GI bleeding, stable', effect:{ ctas: 2 } },
      { id:'occult', label:'Occult blood / minor bleed', effect:{ ctas: 3 } },
    ],
  },
  {
    id: 'constipation',
    title: 'Constipation',
    keywords: ['constipation','hard stool'],
    vitalsHints: ['Abdominal pain? vomiting?'],
    modifiers: [
      { id:'obstruction_suspect', label:'Constipation with obstruction concern', effect:{ ctas: 3 } },
      { id:'simple', label:'Simple constipation', effect:{ ctas: 5 } },
    ],
  },

  // ==== Endocrine / Metabolic ====
  {
    id: 'hyperglycemia',
    title: 'Hyperglycemia',
    keywords: ['hyperglycemia','high glucose','diabetes','DKA'],
    vitalsHints: ['Enter glucose & symptoms; DKA/HHS features?'],
    modifiers: [
      { id:'dka_hhs', label:'DKA/HHS features (vomiting, Kussmaul, confusion)', effect:{ ctas: 2 } },
      { id:'gt18_symptoms', label:'Glucose >18 mmol/L, symptomatic', effect:{ ctas: 2 } },
      { id:'gt18_asx', label:'Glucose >18 mmol/L, asymptomatic', effect:{ ctas: 3 } },
    ],
  },
  {
    id: 'random_blood_sugar',
    title: 'Random Blood Sugar — Check',
    keywords: ['RBS','random blood sugar','glucose','diabetes'],
    vitalsHints: ['Symptoms of hypo/hyperglycemia'],
    modifiers: [
      { id:'hypoglycemia_symptomatic', label:'Hypoglycemia with symptoms', effect:{ ctas: 2 } },
      { id:'hyperglycemia_symptomatic', label:'Hyperglycemia with symptoms', effect:{ ctas: 2 } },
      { id:'hyperglycemia_asx', label:'Hyperglycemia, asymptomatic', effect:{ ctas: 3 } },
      { id:'asymptomatic_request', label:'Asymptomatic sugar check', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'lab_thyroid_request',
    title: 'Lab Request — TSH, T3, T4',
    keywords: ['TSH','T3','T4','thyroid','lab request'],
    vitalsHints: ['Symptoms suggesting thyrotoxicosis or myxedema?'],
    modifiers: [
      { id:'toxicosis_or_myxedema', label:'Severe thyrotoxicosis / myxedema features', effect:{ ctas: 2 } },
      { id:'symptomatic', label:'Symptomatic thyroid issue (moderate)', effect:{ ctas: 4 } },
      { id:'asymptomatic_request', label:'Asymptomatic lab request', effect:{ ctas: 5 } },
    ],
  },

  // ==== GU ====
  {
    id: 'urinary_symptoms',
    title: 'Urinary Symptoms',
    keywords: ['UTI','dysuria','frequency','retention'],
    vitalsHints: ['Fever? flank pain? pregnancy?'],
    modifiers: [
      { id:'retention', label:'Acute urinary retention', effect:{ ctas: 2 } },
      { id:'pyelo', label:'Fever + flank pain (pyelonephritis)', effect:{ ctas: 3 } },
      { id:'pregnant_symptomatic', label:'Pregnant with UTI symptoms', effect:{ ctas: 3 } },
      { id:'cystitis', label:'Cystitis symptoms, no fever', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'burning_micturition',
    title: 'Burning Micturition',
    keywords: ['dysuria','UTI','urinary symptoms','cystitis','pyelonephritis'],
    vitalsHints: ['Fever, flank pain, urinary retention, pregnancy'],
    modifiers: [
      { id:'retention', label:'Acute urinary retention', effect:{ ctas: 2 } },
      { id:'pyelo', label:'Fever + flank pain (pyelonephritis)', effect:{ ctas: 3 } },
      { id:'pregnant_symptomatic', label:'Pregnant with UTI symptoms', effect:{ ctas: 3 } },
      { id:'cystitis', label:'Cystitis symptoms, no fever', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'renal_colic',
    title: 'Renal Colic',
    keywords: ['renal colic','stone','flank pain'],
    vitalsHints: ['Pain, vomiting, fever?'],
    modifiers: [
      { id:'stone_with_fever', label:'Stone with fever / obstruction concern', effect:{ ctas: 2 } },
      { id:'severe_pain', label:'Severe flank pain / vomiting', effect:{ ctas: 3 } },
      { id:'mild_pain', label:'Mild flank pain', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'pv_bleeding',
    title: 'PV Bleeding',
    keywords: ['PV bleeding','vaginal bleeding','gyne'],
    vitalsHints: ['Pregnancy status, hemodynamics, pain'],
    modifiers: [
      { id:'unstable_heavy', label:'Heavy bleeding with instability', effect:{ ctas: 1 } },
      { id:'heavy_stable', label:'Heavy bleeding but stable', effect:{ ctas: 2 } },
      { id:'moderate', label:'Moderate bleeding / pain', effect:{ ctas: 3 } },
      { id:'spotting_mild', label:'Spotting, stable', effect:{ ctas: 4 } },
    ],
  },

  // ==== MSK / Trauma / Wounds ====
  {
    id: 'back_pain',
    title: 'Back Pain',
    keywords: ['back pain','low back','sciatica'],
    vitalsHints: ['Red flags: retention, saddle anesthesia, fever, IVDA'],
    modifiers: [
      { id:'cauda_red_flags', label:'Back pain with red flags (cauda / infection)', effect:{ ctas: 2 } },
      { id:'moderate', label:'Moderate acute back pain', effect:{ ctas: 4 } },
      { id:'chronic_mild', label:'Chronic mild back pain', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'back_pain_cough_revisit',
    title: 'Back Pain, Cough — Revisit',
    keywords: ['back pain','cough','revisit','return'],
    vitalsHints: ['Back red flags, temp, SpO₂'],
    modifiers: [
      { id:'back_red_flags', label:'Back pain red flags (neurologic, infection, retention)', effect:{ ctas: 2 } },
      { id:'worsening_revisit', label:'Revisit with worsening symptoms', effect:{ ctas: 3 } },
      { id:'mild_stable', label:'Mild back pain + cough, stable', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'both_leg_pain',
    title: 'Both Leg Pain',
    keywords: ['leg pain','bilateral','myalgia'],
    vitalsHints: ['NV status, swelling, DVT signs, trauma?'],
    modifiers: [
      { id:'nv_compromise', label:'Neurovascular compromise', effect:{ ctas: 2 } },
      { id:'dvt_concern', label:'DVT concern / swelling / tenderness', effect:{ ctas: 3 } },
      { id:'muscle_pain_mild', label:'Muscle pain, mild, ambulatory', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'left_knee_pain_no_deformity',
    title: 'Left Knee Pain (No Deformity)',
    keywords: ['knee pain','left knee','no deformity'],
    vitalsHints: ['Effusion? weight-bearing? fever?'],
    modifiers: [
      { id:'septic_joint_concern', label:'Hot swollen knee / septic arthritis concern', effect:{ ctas: 3 } },
      { id:'severe_pain_cant_weight_bear', label:'Severe pain, can’t weight-bear', effect:{ ctas: 4 } },
      { id:'mild', label:'Mild pain, no deformity', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'left_foot_pain',
    title: 'Left Foot Pain',
    keywords: ['foot pain','left foot'],
    vitalsHints: ['NV status, deformity, wound'],
    modifiers: [
      { id:'nv_compromise', label:'Neurovascular compromise / open wound', effect:{ ctas: 2 } },
      { id:'deformity_or_fracture_suspect', label:'Deformity / fracture suspected', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild pain, ambulatory', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'bilateral_foot_sole_pain',
    title: 'Bilateral Foot Sole Pain',
    keywords: ['foot pain','bilateral','sole'],
    vitalsHints: ['NV status, trauma, swelling'],
    modifiers: [
      { id:'nv_compromise', label:'Neurovascular compromise / severe swelling', effect:{ ctas: 2 } },
      { id:'moderate_pain', label:'Moderate pain affecting ambulation', effect:{ ctas: 4 } },
      { id:'mild', label:'Mild pain, ambulatory', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'long_bone_fracture',
    title: 'Long Bone Injury / Fracture',
    keywords: ['fracture','long bone','deformity'],
    vitalsHints: ['NV status, bleeding, pain score'],
    modifiers: [
      { id:'open_fracture', label:'Open fracture / NV compromise', effect:{ ctas: 2 } },
      { id:'deformity_pain_high', label:'Deformity with severe pain', effect:{ ctas: 3 } },
      { id:'no_deformity_mild', label:'No deformity, mild pain', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'left_leg_trauma',
    title: 'Left Leg Trauma',
    keywords: ['leg trauma','injury','left leg'],
    vitalsHints: ['NV status, deformity, bleeding'],
    modifiers: [
      { id:'open_or_nv_compromise', label:'Open fracture / neurovascular compromise', effect:{ ctas: 2 } },
      { id:'deformity_severe_pain', label:'Deformity with severe pain', effect:{ ctas: 3 } },
      { id:'soft_tissue_mild', label:'Minor soft tissue injury', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'head_trauma',
    title: 'Head Trauma',
    keywords: ['head injury','concussion','TBI'],
    vitalsHints: ['GCS, anticoagulants, vomiting, neuro deficit'],
    modifiers: [
      { id:'gcs_9_or_less', label:'GCS ≤ 9 / airway concern', effect:{ ctas: 1 } },
      { id:'gcs_10_13_or_redflags', label:'GCS 10–13 or high-risk features (anticoagulation, repeated vomiting, focal deficit)', effect:{ ctas: 2 } },
      { id:'loc_or_danger_mech', label:'Brief LOC/amnesia or dangerous mechanism', effect:{ ctas: 3 } },
      { id:'minor_no_loc', label:'Minor head injury, no LOC', effect:{ ctas: 4 } },
    ],
  },
  {
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
  },
  {
    id: 'burns',
    title: 'Burns',
    keywords: ['burn','scald','flame','electrical'],
    vitalsHints: ['TBSA, airway, location'],
    modifiers: [
      { id:'airway_burn', label:'Airway burn / inhalation injury', effect:{ ctas: 1 } },
      { id:'major_burn', label:'Major burn (e.g., >10% adult / hands/face)', effect:{ ctas: 2 } },
      { id:'minor_burn', label:'Minor burn', effect:{ ctas: 4 } },
    ],
  },

  // ==== Environmental ====
  {
    id: 'heat_stroke',
    title: 'Heat Illness / Stroke',
    keywords: ['heat stroke','heat exhaustion'],
    vitalsHints: ['Temp, CNS status, hydration'],
    modifiers: [
      { id:'heat_stroke', label:'Heat stroke (CNS changes)', effect:{ ctas: 1 } },
      { id:'heat_exhaustion', label:'Heat exhaustion', effect:{ ctas: 3 } },
      { id:'heat_cramps', label:'Heat cramps', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'hypothermia',
    title: 'Hypothermia',
    keywords: ['hypothermia','cold'],
    vitalsHints: ['Core temperature'],
    modifiers: [
      { id:'severe', label:'Severe hypothermia', effect:{ ctas: 1 } },
      { id:'moderate', label:'Moderate hypothermia', effect:{ ctas: 2 } },
      { id:'mild', label:'Mild hypothermia', effect:{ ctas: 3 } },
    ],
  },

  // ==== Allergy / ENT ====
  {
    id: 'allergic_anaphylaxis',
    title: 'Allergic Reaction / Anaphylaxis',
    keywords: ['allergy','anaphylaxis','urticaria','swelling'],
    vitalsHints: ['Airway involvement? hypotension?'],
    modifiers: [
      { id:'anaphylaxis', label:'Anaphylaxis (airway / hypotension)', effect:{ ctas: 1 } },
      { id:'angioedema', label:'Angioedema without airway compromise', effect:{ ctas: 2 } },
      { id:'urticaria_only', label:'Urticaria only, stable', effect:{ ctas: 4 } },
    ],
  },
  {
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
  },
  {
    id: 'otitis_media',
    title: 'Ear Pain / Otitis Media',
    keywords: ['ear pain','otitis'],
    vitalsHints: ['Fever? perforation?'],
    modifiers: [
      { id:'mastoiditis_suspect', label:'Severe ear pain / mastoiditis concern', effect:{ ctas: 3 } },
      { id:'simple_otitis', label:'Simple otitis media', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'sinusitis',
    title: 'Sinusitis',
    keywords: ['sinus','sinusitis','facial pain'],
    vitalsHints: ['Fever? duration?'],
    modifiers: [
      { id:'orbital_complication', label:'Sinusitis with orbital complications', effect:{ ctas: 2 } },
      { id:'moderate', label:'Moderate sinus symptoms', effect:{ ctas: 4 } },
      { id:'mild', label:'Mild sinus symptoms', effect:{ ctas: 5 } },
    ],
  },

  // ==== Dental / Skin ====
  {
    id: 'dental_pain',
    title: 'Dental Pain / Abscess',
    keywords: ['dental','tooth','abscess','toothache'],
    vitalsHints: ['Airway / facial swelling'],
    modifiers: [
      { id:'facial_swelling', label:'Dental infection with facial swelling', effect:{ ctas: 3 } },
      { id:'dental_pain_mild', label:'Dental pain, no swelling', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'cellulitis',
    title: 'Cellulitis',
    keywords: ['cellulitis','skin infection'],
    vitalsHints: ['Fever, spreading, location'],
    modifiers: [
      { id:'systemic_toxic', label:'Toxic/systemic signs', effect:{ ctas: 2 } },
      { id:'significant', label:'Significant cellulitis', effect:{ ctas: 3 } },
      { id:'localized', label:'Localized mild cellulitis', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'abscess',
    title: 'Abscess',
    keywords: ['abscess','boil'],
    vitalsHints: ['Fluctuance, location, fever'],
    modifiers: [
      { id:'systemic', label:'Abscess with systemic features', effect:{ ctas: 3 } },
      { id:'simple', label:'Simple localized abscess', effect:{ ctas: 4 } },
    ],
  },

  // ==== Fever generic (Adult/Peds) ====
  {
    id: 'fever_adult',
    title: 'Fever (Adult)',
    keywords: ['fever','pyrexia','infection'],
    vitalsHints: ['Temp, immunocompromise, general appearance'],
    modifiers: [
      { id:'septic_look', label:'Fever with septic/unwell look', effect:{ ctas: 2 } },
      { id:'fever_unwell', label:'Fever, looks unwell', effect:{ ctas: 3 } },
      { id:'fever_well', label:'Fever, looks well', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'fever_peds',
    title: 'Fever (Pediatric)',
    keywords: ['fever','peds','child','infant'],
    vitalsHints: ['Age in months, appearance, hydration'],
    modifiers: [
      { id:'neonate', label:'Fever in neonate (<28 days)', effect:{ ctas: 2 } },
      { id:'ill_appearing', label:'Ill-appearing febrile child', effect:{ ctas: 3 } },
      { id:'well_appearing', label:'Well-appearing febrile child', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'fever_and_cough',
    title: 'Fever & Cough',
    keywords: ['fever','cough','pneumonia','flu'],
    vitalsHints: ['SpO₂, RR, fever, general appearance'],
    modifiers: [
      { id:'hypoxia_or_distress', label:'Hypoxia or respiratory distress', effect:{ ctas: 2 } },
      { id:'fever_tachypnea', label:'Fever with tachypnea', effect:{ ctas: 3 } },
      { id:'well_mild', label:'Well-appearing, mild symptoms', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'fever_constipation',
    title: 'Fever & Constipation',
    keywords: ['fever','constipation'],
    vitalsHints: ['Abdominal pain severity, obstruction features'],
    modifiers: [
      { id:'severe_pain_or_obstruction', label:'Severe pain / obstruction concern', effect:{ ctas: 2 } },
      { id:'unwell_appearance', label:'Fever with unwell appearance', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild fever + constipation, well', effect:{ ctas: 5 } },
    ],
  },

  // ==== SOB + combos ====
  {
    id: 'sob_basic',
    title: 'Shortness of Breath (SOB)',
    keywords: ['shortness of breath','dyspnea'],
    vitalsHints: ['SpO₂, RR, accessory muscles, speech'],
    modifiers: [
      { id:'severe_distress', label:'Severe respiratory distress', effect:{ ctas: 1 } },
      { id:'moderate_hypoxia', label:'Moderate distress or hypoxia', effect:{ ctas: 2 } },
      { id:'mild_no_distress', label:'Mild SOB, no distress', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'sob_and_cough',
    title: 'SOB & Cough',
    keywords: ['sob','cough','dyspnea'],
    vitalsHints: ['SpO₂, RR, distress'],
    modifiers: [
      { id:'severe_distress', label:'Severe respiratory distress', effect:{ ctas: 1 } },
      { id:'moderate_hypoxia', label:'Moderate distress / hypoxia', effect:{ ctas: 2 } },
      { id:'mild', label:'Mild cough with SOB, stable', effect:{ ctas: 3 } },
    ],
  },

  // ==== Misc ====
  {
    id: 'general_weakness',
    title: 'General Weakness',
    keywords: ['weakness','fatigue'],
    vitalsHints: ['Hypoxia, hypotension, focal deficits, dehydration'],
    modifiers: [
      { id:'instability_or_deficit', label:'Instability (hypoxia/hypotension) or focal neuro deficit', effect:{ ctas: 2 } },
      { id:'unwell_dehydrated_febrile', label:'Unwell / dehydrated / febrile', effect:{ ctas: 3 } },
      { id:'chronic_mild', label:'Chronic or mild fatigue, stable', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'palpitations',
    title: 'Palpitations / Arrhythmia',
    keywords: ['palpitations','arrhythmia','SVT','AF'],
    vitalsHints: ['ECG, hemodynamics'],
    modifiers: [
      { id:'unstable', label:'Palpitations with instability', effect:{ ctas: 1 } },
      { id:'fast_irregular', label:'Rapid irregular or SVT stable', effect:{ ctas: 2 } },
      { id:'benign', label:'Benign palpitations / anxiety', effect:{ ctas: 4 } },
    ],
  },
  {
    id: 'dehydration',
    title: 'Dehydration',
    keywords: ['dehydration','dry','low intake'],
    vitalsHints: ['Mucous membranes, orthostatics'],
    modifiers: [
      { id:'severe', label:'Severe dehydration', effect:{ ctas: 2 } },
      { id:'moderate', label:'Moderate dehydration', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild dehydration', effect:{ ctas: 4 } },
    ],
  },

  // ==== Combined complaints from user ====
  {
    id: 'headache_body_pain',
    title: 'Headache & Body Pain',
    keywords: ['headache','myalgia','viral'],
    vitalsHints: ['Worst-ever? neuro deficits? fever?'],
    modifiers: [
      { id:'red_flags', label:'Worst-ever / neuro deficit / red flags', effect:{ ctas: 2 } },
      { id:'viral_like', label:'Viral-like illness (fever + myalgia), stable', effect:{ ctas: 4 } },
      { id:'typical_migraine', label:'Typical migraine history', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'cough_body_pain_headache',
    title: 'Cough, Body Pain & Headache',
    keywords: ['cough','myalgia','headache','flu-like'],
    vitalsHints: ['SpO₂, RR, fever'],
    modifiers: [
      { id:'resp_distress_or_hypoxia', label:'Respiratory distress / hypoxia', effect:{ ctas: 2 } },
      { id:'fever_unwell', label:'Fever with unwell appearance', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild flu-like illness', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'sorethroat_flu',
    title: 'Sore Throat & Flu',
    keywords: ['sore throat','pharyngitis','flu'],
    vitalsHints: ['Airway, swallowing, fever'],
    modifiers: [
      { id:'airway_compromise', label:'Airway compromise / drooling', effect:{ ctas: 2 } },
      { id:'fever_severe_pain', label:'Fever with severe throat pain', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild sore throat/flu-like symptoms', effect:{ ctas: 5 } },
    ],
  },
  {
    id: 'nausea_headache_dizziness',
    title: 'Nausea, Headache & Dizziness',
    keywords: ['nausea','headache','dizziness'],
    vitalsHints: ['Stroke screen, hydration, fever'],
    modifiers: [
      { id:'neuro_deficit', label:'Neuro deficit / stroke concern', effect:{ ctas: 2 } },
      { id:'moderate_unsteady', label:'Moderate symptoms or unsteady', effect:{ ctas: 3 } },
      { id:'mild', label:'Mild, stable', effect:{ ctas: 4 } },
    ],
  },
];
