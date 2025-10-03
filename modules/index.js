import chestPainCardiac from './mod_chest_pain_cardiac.js';
import sob from './mod_shortness_breath.js';
import seizure from './mod_seizure.js';
import stroke from './mod_stroke_tia.js';
import abdominalPain from './mod_abdominal_pain.js';
import headache from './mod_headache.js';
import hyperglycemia from './mod_hyperglycemia.js';
import urti from './mod_urti.js';
import epistaxis from './mod_epistaxis.js';
import allergic from './mod_allergic_anaphylaxis.js';
import giBleed from './mod_gi_bleed.js';

import chestPainNonCardiac from './mod_chest_pain_noncardiac.js';
import backpain from './mod_back_pain.js';
import laceration from './mod_laceration_puncture.js';
import renalColic from './mod_renal_colic.js';
import urinary from './mod_urinary_symptoms.js';
import dehydration from './mod_dehydration.js';
import vomitDiarrhea from './mod_vomit_diarrhea.js';
import dental from './mod_dental_pain.js';
import fracture from './mod_long_bone_fracture.js';
import burns from './mod_burns.js';
import heat from './mod_heat_stroke.js';
import hypothermia from './mod_hypothermia.js';
import palpitations from './mod_palpitations.js';
import constipation from './mod_constipation.js';
import otitis from './mod_otitis_media.js';
import sinusitis from './mod_sinusitis.js';
import fever from './mod_fever_adult.js';
import pedsFever from './mod_fever_peds.js';
import cellulitis from './mod_cellulitis.js';
import abscess from './mod_abscess.js';
import pneumonia from './mod_pneumonia.js';
import pharyngitis from './mod_pharyngitis.js';

export default [
  chestPainNonCardiac, backpain, laceration, renalColic, urinary, dehydration, vomitDiarrhea, dental, fracture, burns, heat, hypothermia, palpitations, constipation, otitis, sinusitis, fever, pedsFever, cellulitis, abscess, pneumonia, pharyngitis,
  chestPainCardiac, sob, seizure, stroke,
  abdominalPain, headache, hyperglycemia, urti, epistaxis, allergic, giBleed
];
