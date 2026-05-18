# Adult Advanced Life Support 2025-2026 Seed Data Specification

Status: Draft reference specification
Last researched: 2026-05-18
Write boundary: documentation only; do not import into OpenGRADE until explicitly requested

## Purpose

This document defines a detailed seed-data suite for an adult advanced life support guideline in OpenGRADE. It is designed as a future import package for development, testing, and demonstration of guideline authoring, PICO evidence, GRADE outcomes, recommendations, EtD factors, section placement, and source traceability.

This is not a clinical guideline and must not be presented as an endorsed local protocol. Seed content must preserve source status clearly:

- Final 2025 ERC adult ALS guideline content can be used as the primary guideline-facing source.
- Final 2025 ILCOR ALS CoSTR content can be used as the primary evidence/recommendation source.
- 2026 ALS CoSTR pages located during research are draft/public-comment evidence records and must be tagged as draft evidence, not final guidance.
- No final ERC 2026 adult ALS guideline update was located on 2026-05-18.

## Team Research Summary

The source collection was split into three lanes:

- ILCOR lane: final 2025 ALS CoSTR source hierarchy and 2026 draft/public-comment CoSTR pages.
- ERC lane: final ERC 2025 adult ALS guideline, official ERC guideline hub, algorithms/assets, special circumstances, and post-resuscitation care.
- OpenGRADE lane: local Prisma schema, current seed style, import constraints, and model mapping.

No files outside this documentation were changed as part of the research lanes, and no database writes were performed.

## Source Hierarchy

Use this hierarchy when resolving conflicts:

1. Final ERC Guidelines 2025 Adult Advanced Life Support for guideline-facing wording and algorithms.
2. Final ILCOR Advanced Life Support 2025 CoSTR for evidence provenance, certainty, and treatment recommendations.
3. ILCOR CoSTR topic pages for documented PICOST, EtD tables, draft/public-comment updates, and knowledge gaps.
4. ERC 2025 Special Circumstances and ERC-ESICM 2025 Post-Resuscitation Care for adjacent ALS content that is not fully contained in the adult ALS chapter.
5. ERC algorithm/key-message assets for concise visual-flow metadata only.

The ILCOR preprint page states the 2025 preprint package is a draft and not for citation. Use the final DOI publications for citation, and use the preprint appendices only as extraction aids when the final publication does not expose enough structured EtD detail.

## Canonical References

Seed references should use stable local `key` values. Store source status in `fhirMeta` or importer metadata so draft evidence is not confused with final guidance.

| Key | Title | Year | Type | Status | DOI / URL | Seed Use |
| --- | --- | ---: | --- | --- | --- | --- |
| `erc-2025-als-guideline` | European Resuscitation Council Guidelines 2025: Adult Advanced Life Support | 2025 | `OTHER` | Final guideline | DOI `10.1016/j.resuscitation.2025.110769`; https://www.erc.edu/media/vedoa2ga/gl2025-05-als-e.pdf | Primary guideline text, ALS algorithm, sections, practical statements |
| `erc-2025-guidelines-hub` | ERC Guidelines 2025 hub | 2025 | `OTHER` | Official index | https://www.erc.edu/science-research/guidelines/guidelines-2025/ | Guideline release provenance |
| `erc-2025-release-citations` | 2025 ERC Guidelines is released | 2025 | `OTHER` | Official index | https://www.erc.edu/news/2025-erc-guidelines-is-released/ | Canonical chapter citations and release date |
| `erc-2025-special-circumstances` | ERC Guidelines 2025: Special Circumstances in Resuscitation | 2025 | `OTHER` | Final guideline | DOI `10.1016/j.resuscitation.2025.110753`; https://www.erc.edu/umbraco/api/download-page/download/42abc146-e668-4721-85d0-dc2d4caef2cc | Reversible causes, special populations, setting modifications |
| `erc-esicm-2025-post-resus` | ERC-ESICM Guidelines 2025: Post-Resuscitation Care | 2025 | `OTHER` | Final guideline | DOI `10.1016/j.resuscitation.2025.110809`; https://www.erc.edu/umbraco/api/download-page/download/611c88f7-57b9-4536-8ccb-ea828601c7f4 | ROSC stabilization, oxygenation, ventilation, hemodynamics |
| `ilcor-publications-index` | ILCOR publications index | 2026 | `OTHER` | Official index | https://www.ilcor.org/publications/ | Confirms 2026 publication list and 2025 CoSTR links |
| `ilcor-2025-als-costr-circulation` | Advanced Life Support: 2025 ILCOR CoSTR | 2025 | `OTHER` | Final CoSTR | DOI `10.1161/CIR.0000000000001360`; https://doi.org/10.1161/CIR.0000000000001360 | Final ALS CoSTR recommendations and certainty |
| `ilcor-2025-als-costr-resuscitation` | Advanced Life Support: 2025 ILCOR CoSTR | 2025 | `OTHER` | Final CoSTR | DOI `10.1016/j.resuscitation.2025.110806`; https://doi.org/10.1016/j.resuscitation.2025.110806 | Final ALS CoSTR duplicate journal publication |
| `ilcor-2025-preprint-index` | 2025 ILCOR CoSTR preprint package | 2025 | `OTHER` | Draft extraction aid | https://www.ilcor.org/publications/preprint | Appendix discovery only |
| `ilcor-2025-als-full-preprint` | ALS 2025 CoSTR full chapter preprint | 2025 | `OTHER` | Draft extraction aid | https://www.ilcor.org/uploads/ALS-2025-COSTR-Full-Chapter.pdf | Structured extraction when final text is not accessible |
| `ilcor-2025-als-appendix-a-etd` | ALS 2025 Appendix A: Evidence-to-Decision Tables | 2025 | `OTHER` | Draft extraction aid | https://www.ilcor.org/uploads/ALS-2025-Appendix-A-Evidence-to-Decision-Tables.pdf | EtD factor seed detail |
| `ilcor-2025-als-appendix-b-evidence` | ALS 2025 Appendix B: Evidence Updates | 2025 | `OTHER` | Draft extraction aid | https://www.ilcor.org/uploads/ALS-2025-Appendix-B-Evidence-Updates.pdf | Evidence update metadata |
| `ilcor-2025-als-appendix-c-tables` | ALS 2025 Appendix C: Supplementary Tables | 2025 | `OTHER` | Draft extraction aid | https://www.ilcor.org/uploads/ALS-2025-Appendix-C-Supplementary-Tables.pdf | Supplementary tables |
| `ilcor-2024-mechanical-cpr` | Mechanical CPR Devices ALS 3002 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/mechanical-cpr-devices-als-3002-tf-sr | Manual versus mechanical compressions |
| `ilcor-2024-pad-placement` | Pad/Paddle Size and Placement in Adults BLS/ALS | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/pad-paddle-size-and-placement-in-adults-bls-and-als-sr-bls-2601 | Pad placement and refractory VF vector-change evidence |
| `ilcor-2024-iv-io-access` | IV versus IO Access ALS 2046/3200 | 2024 | `SYSTEMATIC_REVIEW` | Updated CoSTR topic | https://costr.ilcor.org/document/als-2046-io-v-iv-drugs-tf-systematic-review | Initial vascular access route |
| `ilcor-2024-vasopressors` | Vasopressors in Adult Cardiac Arrest ALS 3208 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/vasopressors-in-adult-cardiac-arrest-als-3208-tf-sr | Epinephrine and vasopressor evidence |
| `ilcor-2024-buffering-agents` | Buffering Agents for Cardiac Arrest ALS 3205 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/buffering-agents-for-cardiac-arrest-als-3205-tf-sr | Sodium bicarbonate routine-use rule |
| `ilcor-2024-hyperkalemia` | Pharmacological Interventions for Acute Hyperkalemia ALS 3403 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/pharmacological-interventions-for-the-acute-treatment-of-hyperkalemia-als-3403-tf-sr | Hyperkalemia reversible cause |
| `ilcor-2024-opioid-als` | Opioid-Specific ALS Therapies ALS 3451 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/opioid-specific-advanced-life-support-therapies-for-cardiac-arrest-als-3451-tf-sr | Opioid-associated cardiac arrest |
| `ilcor-post-rosc-oxygen-co2` | Oxygen and Carbon Dioxide Targets After ROSC | 2025 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/oxygen-and-carbon-dioxide-targets-in-patients-with-return-of-spontaneous-circulation-after-cardiac-arrest-als-3305-3506-3516-3517-tf-sr | Post-ROSC ventilation and oxygenation |
| `ilcor-2024-post-rosc-mcs` | Mechanical Circulatory Support After ROSC ALS 3505 | 2024 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/mechanical-circulatory-support-after-return-of-spontaneous-circulation-following-cardiac-arrest-a-systematic-review-als-3505-tf-sr | Post-ROSC cardiogenic shock |
| `ilcor-map-target` | Mean Arterial Blood Pressure Target After Cardiac Arrest | 2023 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/mean-arterial-blood-pressure-target-in-post-cardiac-arrest-care-patients-als-new-tfsr | Post-ROSC hemodynamic targets |
| `ilcor-post-rosc-vasopressor-choice` | Vasopressor Choice After Cardiac Arrest ALS 3528 | 2023 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/vasopressor-choice-for-managing-low-blood-pressure-after-cardiac-arrest-als-3528-tf-sr | Post-ROSC vasopressor uncertainty |
| `ilcor-2019-airway-adult` | Advanced Airway Management During Adult Cardiac Arrest | 2019 | `SYSTEMATIC_REVIEW` | Final CoSTR topic | https://costr.ilcor.org/document/advanced-airway-management-during-adult-cardiac-arrest | Bag-mask, SGA, tracheal intubation |
| `ilcor-2018-antiarrhythmics` | Antiarrhythmic Drugs for Cardiac Arrest - Adults | 2018 | `SYSTEMATIC_REVIEW` | Final CoSTR topic | https://costr.ilcor.org/document/antiarrhythmic-drugs-for-cardiac-arrest-adults | Amiodarone/lidocaine evidence background |
| `ilcor-ecpr-adult` | Extracorporeal CPR for Cardiac Arrest ALS TFSR | 2023 | `SYSTEMATIC_REVIEW` | CoSTR topic | https://costr.ilcor.org/document/extracorporeal-cardiopulmonary-resuscitation-ecpr-for-cardiac-arrest-als-tfsr | ECPR rescue therapy |
| `ilcor-2026-oxygen-cpr` | ALS 3305 Supplemental Oxygen During CPR | 2026 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/als-3305-use-of-supplemental-oxygen-during-cardiopulmonary-resuscitation-tf-sr | Maximal inspired oxygen during CPR |
| `ilcor-2026-ventilation-parameters` | BLS 2401 Ventilation Parameters During Adult CPR | 2026 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/bls-2401-ventilation-parameters-during-adult-cardiopulmonary-resuscitation-tf-sr | Ventilation rate and volume during CPR |
| `ilcor-2026-volume-therapy` | ALS 3207 Volume Therapy for Cardiac Arrest | 2026 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/als-3207-volume-therapy-for-cardiac-arrest-tf-sr | Intra-arrest and post-arrest volume therapy |
| `ilcor-2026-im-epinephrine` | ALS 3212 Intramuscular Epinephrine for Cardiac Arrest | 2026 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/als-3212-intramuscular-epinephrine-for-cardiac-arrest-tf-sr | IM epinephrine evidence gap |
| `ilcor-2025-thrombolysis` | ALS 3203 Thrombolysis for Cardiac Arrest | 2025 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/als-3203-the-effect-of-thrombolysis-for-cardiac-arrest-tf-sr | Routine thrombolysis during undifferentiated arrest |
| `ilcor-2026-video-laryngoscopy` | ALS 3308 Video versus Direct Laryngoscopy During CPR | 2026 | `SYSTEMATIC_REVIEW` | Draft/public-comment CoSTR | https://costr.ilcor.org/document/als-3308-tracheal-intubation-using-video-laryngoscopy-as-compared-to-direct-laryngoscopy-during-cardiopulmonary-resuscitation-tf-sr | Future airway intubation technique seed |

## Package Shape

The seed package should be authored in YAML or JSON using stable local keys. An importer should map keys to UUIDs in one transaction.

```yaml
seedVersion: "1.0"
packageKey: adult-als-2025-2026
generatedFromSpec: docs/database/adult-als-2025-2026-seed-data-spec.md
sourceCutoffDate: "2026-05-18"
evidencePolicy:
  finalGuidanceSources:
    - erc-2025-als-guideline
    - ilcor-2025-als-costr-circulation
  draftEvidenceRequiresTag: true
  noClinicalEndorsement: true
organizations: []
users: []
organizationMembers: []
guidelines:
  - key: adult-als-2025-2026-guideline
    organizationKey: demo-org
    createdByUserKey: demo-admin
    guideline: {}
    permissions: []
    sections: []
    references: []
    picos: []
    recommendations: []
    tags: []
    links:
      sectionReferences: []
      sectionPicos: []
      sectionRecommendations: []
      picoRecommendations: []
      outcomeReferences: []
      recommendationTags: []
```

## OpenGRADE Model Mapping

Use these schema and DTO names exactly. Rich text values should be TipTap JSON, not raw markdown strings.

| Seed Concept | OpenGRADE Entity | Required / Important Fields |
| --- | --- | --- |
| Organization | `Organization` | `name`, `description`, optional `customColors`, optional `strengthLabels` |
| Demo users | `User` | `keycloakId`, `email`, `displayName`, `locale` |
| Membership | `OrganizationMember` | `organizationKey`, `userKey`, `role` |
| Guideline shell | `Guideline` | `title`, `shortName`, `description`, `disclaimer`, `language`, `guidelineType`, `status`, `etdMode`, `picoDisplayMode`, `createdBy` |
| Sections | `Section` | `title`, `parentKey`, `text`, `ordering`, `nestingLevel`, `excludeFromNumbering` |
| Sources | `Reference` | `title`, `authors`, `year`, `abstract`, `doi`, `url`, `studyType`, `fhirMeta` |
| Clinical questions | `Pico` | `population`, `intervention`, `comparator`, `narrativeSummary`, `importSource`, `fhirMeta` |
| Outcomes | `Outcome` | `title`, `outcomeType`, `state`, `ordering`, `importance`, `certaintyOverall`, GRADE downgrade fields, effect fields where available |
| Recommendations | `Recommendation` | `title`, `description`, `strength`, `recommendationType`, `certaintyOfEvidence`, `remark`, `rationale`, `recStatus`, `createdBy`, `updatedBy` |
| EtD | `EtdFactor`, `EtdJudgment` | `factorType`, `summaryText`, `researchEvidence`, `additionalConsiderations`, judgments |
| Implementation issues | `PracticalIssue` | `category`, `title`, `description`, `ordering` |
| Code mappings | `PicoCode`, `EmrElement` | `codeSystem`, `code`, `display`, `element` |
| Placements | Join tables | `SectionReference`, `SectionPico`, `SectionRecommendation`, `PicoRecommendation`, `OutcomeReference`, `RecommendationTag` |

Do not include `fhirExtensions` in the seed package unless the schema is extended; the current Prisma schema persists `fhirMeta`, not `fhirExtensions`.

## Guideline Shell

Recommended guideline seed:

```yaml
key: adult-als-2025-2026-guideline
guideline:
  title: "Adult Advanced Life Support: 2025 ERC / ILCOR Evidence Seed"
  shortName: "adult-als-2025-2026"
  description: "Documentation seed for adult advanced life support recommendations and evidence statements based on ERC 2025 and ILCOR 2025/2026 sources."
  disclaimer: "Seed data for software testing and guideline-authoring demonstration only. Not a clinical protocol or endorsed local guideline."
  funding: "No external funding. Source material from publicly available ERC and ILCOR publications."
  contactName: "OpenGRADE Demo"
  contactEmail: "demo@example.invalid"
  language: "en"
  guidelineType: "EVIDENCE_SUMMARY"
  status: "DRAFT_INTERNAL"
  etdMode: "TWELVE_FACTOR"
  showSectionNumbers: true
  showCertaintyInLabel: true
  showGradeDescription: true
  trackChangesDefault: false
  enableSubscriptions: false
  enablePublicComments: false
  showSectionTextPreview: true
  pdfColumnLayout: 1
  picoDisplayMode: "INLINE"
  isPublic: false
  fhirMeta:
    evidenceSourceCutoffDate: "2026-05-18"
    clinicalUse: false
    sourceHierarchy:
      - erc-2025-als-guideline
      - ilcor-2025-als-costr-circulation
```

## Section Suite

Create sections before PICOs and recommendations. Keep section nesting at three levels or fewer.

| Key | Parent | Level | Order | Purpose |
| --- | --- | ---: | ---: | --- |
| `sec-scope-methods` |  | 0 | 10 | Scope, source hierarchy, methods, GRADE/EtD status |
| `sec-prevention-recognition` |  | 0 | 20 | Prevention of IHCA/OHCA, early warning, cardiac arrest recognition |
| `sec-systems-response` |  | 0 | 30 | In-hospital and out-of-hospital ALS response systems |
| `sec-als-algorithm` |  | 0 | 40 | Adult ALS algorithm overview |
| `sec-shockable-rhythms` | `sec-als-algorithm` | 1 | 10 | VF/pVT sequence, shock timing, drugs |
| `sec-non-shockable-rhythms` | `sec-als-algorithm` | 1 | 20 | PEA/asystole sequence and early adrenaline |
| `sec-reversible-causes` | `sec-als-algorithm` | 1 | 30 | 4Hs/4Ts and targeted interventions |
| `sec-defibrillation` |  | 0 | 50 | Manual defibrillation, pad position, refractory VF |
| `sec-airway-ventilation` |  | 0 | 60 | Bag-mask, advanced airway, ventilation parameters, oxygen |
| `sec-capnography-pocus-monitoring` | `sec-airway-ventilation` | 1 | 10 | ETCO2, waveform capnography, POCUS boundaries |
| `sec-vascular-drugs-fluids` |  | 0 | 70 | IV/IO route, adrenaline/epinephrine, antiarrhythmics, calcium, bicarbonate, fluids |
| `sec-devices-ecpr` |  | 0 | 80 | Mechanical CPR, REBOA, intra-arrest cooling, ECPR |
| `sec-physiology-guided-cpr` |  | 0 | 90 | Highly monitored cardiac arrest, arterial pressure, ETCO2 targets |
| `sec-periarrest-arrhythmias` |  | 0 | 100 | Tachyarrhythmia and bradyarrhythmia management |
| `sec-special-circumstances` |  | 0 | 110 | PE, hyperkalemia, opioid toxicity, pregnancy, trauma, hypothermia, catheter lab, operating room |
| `sec-post-rosc` |  | 0 | 120 | Post-resuscitation care, oxygen/CO2, MAP, vasopressors, MCS |
| `sec-implementation-etd` |  | 0 | 130 | Implementation issues, resources, feasibility, equity |
| `sec-reference-appendix` |  | 0 | 140 | Source catalogue and evidence status table |

## PICO And Recommendation Suite

Each row is a seed record. Rows marked `DRAFT_PUBLIC_COMMENT` should not become final clinical recommendations without review after final publication.

| Key | Section | Record Type | Population | Intervention | Comparator | Outcomes | Recommendation Seed | Strength | Certainty | Evidence Status | References |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pico-oxygen-during-cpr` | `sec-airway-ventilation` | PICO | Adults with cardiac arrest in any setting | Highest feasible inspired oxygen concentration during CPR | No supplemental or reduced oxygen concentration | Favourable neurological survival, survival, ROSC | Use the highest possible inspired oxygen during CPR; document uncertainty and absence of direct RCTs comparing FiO2 strategies | `CONDITIONAL_FOR` | `VERY_LOW` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2026-oxygen-cpr`, `erc-2025-als-guideline` |
| `pico-ventilation-parameters-cpr` | `sec-airway-ventilation` | PICO | Adults receiving ventilations during CPR, with or without advanced airway | 30:2 ventilations/compressions or 10 ventilations per minute during continuous compressions; visible chest rise; 400-600 mL or 6-10 mL/kg when measured | Alternative ventilation rates or volumes | ROSC, survival, favourable neurological outcome, pH, barotrauma | Seed as adult ventilation parameter recommendation with good-practice statements for visible chest rise and avoiding hyper/hypoventilation | `CONDITIONAL_FOR` | `VERY_LOW` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2026-ventilation-parameters`, `erc-2025-als-guideline` |
| `pico-airway-strategy` | `sec-airway-ventilation` | PICO | Adults in IHCA or OHCA from any cause | Bag-mask ventilation or an advanced airway strategy during CPR | Alternative airway method or no advanced airway | Survival to discharge, 28/30-day survival, favourable neurological outcome, adverse airway events | Bag-mask or advanced airway strategy may be used; if advanced airway is used, select SGA or tracheal intubation according to setting and intubation success | `CONDITIONAL_FOR` | `LOW` | `FINAL_TOPIC` | `ilcor-2019-airway-adult`, `erc-2025-als-guideline` |
| `pico-sga-choice` | `sec-airway-ventilation` | Evidence statement | Adults with cardiac arrest requiring SGA | i-gel SGA | Laryngeal tube or other SGA | Airway success, survival, adverse events | ERC 2025 prefers i-gel when using an SGA | `NOT_SET` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-capnography-tube-placement` | `sec-capnography-pocus-monitoring` | Practice statement | Adults intubated during CPR | Waveform capnography to confirm tracheal tube placement | Clinical assessment alone or absent waveform capnography | Oesophageal intubation detection, CPR quality monitoring, ROSC detection | Use waveform capnography to confirm tracheal tube position and monitor CPR quality; do not stop compressions based on ETCO2 alone | `NOT_SET` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-pad-placement-refractory-vf` | `sec-defibrillation` | PICO | Adults/children with shockable rhythm during CPR | Specific pad position/orientation; alternative vector for refractory VF | Standard anterolateral position only | VF termination, ROSC, survival, refibrillation | Use correct apical/lateral position; consider vector change such as anteroposterior pads after refractory VF and correct initial placement | `CONDITIONAL_FOR` |  | `FINAL_TOPIC` | `ilcor-2024-pad-placement`, `erc-2025-als-guideline` |
| `pico-dual-sequential-defib` | `sec-defibrillation` | Evidence statement | Adults with refractory VF | Dual sequential defibrillation | Standard defibrillation or vector-change strategy | VF termination, ROSC, survival, safety/logistics | Do not use dual sequential defibrillation outside a research setting | `CONDITIONAL_AGAINST` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline`, `ilcor-2024-pad-placement` |
| `pico-mechanical-cpr-routine` | `sec-devices-ecpr` | PICO | Adults/children in cardiac arrest | Powered automated mechanical chest compressions | Manual chest compressions | Survival, favourable neurological outcome, ROSC, adverse events, provider safety | Do not seed routine use; consider only when high-quality manual compressions are impractical or compromise safety | `CONDITIONAL_AGAINST` |  | `FINAL_TOPIC` | `ilcor-2024-mechanical-cpr`, `erc-2025-als-guideline` |
| `pico-ecpr-selected-adults` | `sec-devices-ecpr` | PICO | Selected adults with IHCA or OHCA when conventional CPR is failing | ECPR with ECMO or cardiopulmonary bypass during arrest | Manual or mechanical conventional CPR | Survival, long-term survival, favourable neurological outcome, quality of life, resources | ECPR may be considered as rescue therapy for selected adults in capable systems | `CONDITIONAL_FOR` | `LOW` | `FINAL_TOPIC` | `ilcor-ecpr-adult`, `erc-2025-als-guideline` |
| `pico-iv-versus-io-access` | `sec-vascular-drugs-fluids` | PICO | Adults in cardiac arrest needing vascular access | Initial IV access | Initial IO access | ROSC, survival, favourable neurological outcome, drug delivery time | Attempt IV access first; if IV access cannot be rapidly achieved within two attempts, consider IO | `CONDITIONAL_FOR` | `VERY_LOW` | `FINAL_TOPIC_UPDATED` | `ilcor-2024-iv-io-access`, `erc-2025-als-guideline` |
| `pico-standard-epinephrine` | `sec-vascular-drugs-fluids` | PICO | Adults in cardiac arrest, particularly non-shockable rhythms | Standard IV/IO epinephrine/adrenaline during ALS | No epinephrine or alternative vasopressor strategy | ROSC, survival to admission/discharge, favourable neurological outcome | Seed standard algorithm dosing and early administration for non-shockable rhythms as a final guideline statement; include uncertainty around neurological survival | `CONDITIONAL_FOR` | `LOW` | `FINAL_TOPIC` | `ilcor-2024-vasopressors`, `erc-2025-als-guideline` |
| `pico-im-epinephrine` | `sec-vascular-drugs-fluids` | PICO | Adults with cardiac arrest in any setting | Intra-arrest IM epinephrine added to standard ALS | Standard IV/IO epinephrine once access is available | Survival to admission/discharge, favourable neurological outcome, ROSC, time to first epinephrine | Insufficient evidence to recommend adding IM epinephrine to standard care; do not seed as standard treatment | `NOT_SET` | `VERY_LOW` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2026-im-epinephrine` |
| `pico-antiarrhythmic-refractory-vf` | `sec-vascular-drugs-fluids` | PICO | Adults with shock-refractory VF/pVT | Amiodarone or lidocaine according to algorithm | No antiarrhythmic or alternative drug | ROSC, survival, favourable neurological outcome, recurrent VF | Seed ERC algorithm drug sequence and link to antiarrhythmic evidence as background | `CONDITIONAL_FOR` |  | `FINAL_GUIDELINE_STATEMENT` | `ilcor-2018-antiarrhythmics`, `erc-2025-als-guideline` |
| `pico-calcium-routine` | `sec-vascular-drugs-fluids` | Evidence statement | Adults in cardiac arrest without specific indication | Routine calcium during CPR | No routine calcium | ROSC, survival, adverse effects | Do not routinely give calcium during cardiac arrest except specific indications | `CONDITIONAL_AGAINST` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-buffering-routine` | `sec-vascular-drugs-fluids` | PICO | Adults with IHCA/OHCA | Routine sodium bicarbonate or other buffering agents | Standard care without routine buffering agents | ROSC, survival to admission, survival, favourable neurological outcome | Do not routinely give sodium bicarbonate during cardiac arrest except specific indications | `CONDITIONAL_AGAINST` |  | `FINAL_TOPIC` | `ilcor-2024-buffering-agents`, `erc-2025-als-guideline` |
| `pico-corticosteroids-routine` | `sec-vascular-drugs-fluids` | Evidence statement | Adults in cardiac arrest | Routine corticosteroids during CPR | No routine corticosteroids | ROSC, survival, adverse events | Do not routinely give corticosteroids during cardiac arrest | `CONDITIONAL_AGAINST` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-volume-nontraumatic-cpr` | `sec-vascular-drugs-fluids` | PICO | Adults with undifferentiated non-traumatic cardiac arrest | Routine intravascular volume therapy during CPR | No intravascular volume therapy or different volume therapy | ROSC, survival, favourable neurological outcome | Suggest against routine intravascular volume therapy during CPR in undifferentiated non-traumatic arrest | `CONDITIONAL_AGAINST` | `VERY_LOW` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2026-volume-therapy` |
| `pico-hes-volume` | `sec-vascular-drugs-fluids` | PICO | Adults during CPR or after ROSC | Hydroxyethyl starch solutions | Alternative crystalloids or no HES | Survival, neurological outcome, renal replacement, harms | Recommend against HES during CPR or after ROSC | `STRONG_AGAINST` | `VERY_LOW` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2026-volume-therapy` |
| `pico-thrombolysis-undifferentiated-arrest` | `sec-vascular-drugs-fluids` | PICO | Adults/children with undifferentiated cardiac arrest | Thrombolytic medication during CPR | No thrombolytic medication | Survival at discharge/30 days, favourable neurological outcome, ROSC, bleeding | Recommend against routine thrombolytics during CPR for undifferentiated cardiac arrest; suspected PE is a separate question | `STRONG_AGAINST` | `MODERATE` | `DRAFT_PUBLIC_COMMENT` | `ilcor-2025-thrombolysis`, `erc-2025-special-circumstances` |
| `pico-pocus-during-cpr` | `sec-capnography-pocus-monitoring` | Practice statement | Adults during ALS | Intra-arrest POCUS by skilled operators without prolonging pauses | No POCUS or POCUS causing interruptions | Identification of reversible causes, compression interruptions, termination decisions | Skilled POCUS may help identify treatable causes; do not prolong pauses, diagnose PE from RV dilation alone, or use contractility alone to terminate CPR | `NOT_SET` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-physiology-guided-cpr` | `sec-physiology-guided-cpr` | Evidence statement | Adults with highly monitored cardiac arrest or arterial line monitoring | CPR guided by ETCO2 and/or arterial pressure; small incremental adrenaline in selected monitored low-flow arrests | Standard algorithm without physiology targets | ROSC, CPR quality, hypertension/tachyarrhythmia harms | Seed as consensus/practice statement: consider compressions when sustained SBP <50 mmHg despite interventions; pragmatic DBP and ETCO2 targets can guide CPR quality | `NOT_SET` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-reboa-cardiac-arrest` | `sec-devices-ecpr` | Evidence statement | Adults in cardiac arrest | REBOA | No REBOA/usual ALS | ROSC, survival, vascular complications | Do not use routine REBOA for cardiac arrest unless in a clinical trial | `CONDITIONAL_AGAINST` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-intra-arrest-cooling` | `sec-devices-ecpr` | Evidence statement | Adults during ALS | Intra-arrest cooling | No intra-arrest cooling | Survival, neurological outcome, adverse effects | Do not use intra-arrest cooling during ALS unless severe hyperthermia is present | `CONDITIONAL_AGAINST` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |
| `pico-hyperkalemia-cardiac-arrest` | `sec-special-circumstances` | PICO | Adults/children with hyperkalemia with or without cardiac arrest | Acute potassium-mitigating and potassium-lowering therapies | No therapy, placebo, or different therapy | ROSC, survival, potassium correction, adverse events | Seed as reversible-cause topic with calcium for membrane stabilization and insulin/glucose/beta-agonist/bicarbonate/dialysis details from source review | `NOT_SET` |  | `FINAL_TOPIC` | `ilcor-2024-hyperkalemia`, `erc-2025-special-circumstances` |
| `pico-opioid-associated-arrest` | `sec-special-circumstances` | PICO | Adults/children with cardiac arrest from suspected opioid poisoning | Opioid-specific ALS therapy such as intra-arrest naloxone | Standard BLS/ALS without opioid-specific therapy | Survival, favourable neurological outcome, ROSC | Seed as opioid-associated arrest evidence summary with uncertainty around intra-arrest naloxone benefit | `NOT_SET` |  | `FINAL_TOPIC` | `ilcor-2024-opioid-als`, `erc-2025-special-circumstances` |
| `pico-post-rosc-oxygen-co2` | `sec-post-rosc` | PICO | Unresponsive adults with sustained ROSC after cardiac arrest | Targeted oxygenation and ventilation strategy | No target or alternate SpO2/PaO2/PaCO2 target | Survival, neurological outcome, oxygenation, hyperoxia/hypoxia, hypocapnia/hypercapnia harms | Seed post-ROSC oxygen and carbon dioxide target recommendations from ERC-ESICM and ILCOR | `CONDITIONAL_FOR` |  | `FINAL_TOPIC` | `ilcor-post-rosc-oxygen-co2`, `erc-esicm-2025-post-resus` |
| `pico-post-rosc-map` | `sec-post-rosc` | PICO | Adults after sustained ROSC | Higher MAP target strategy | Lower MAP target strategy | Survival, good functional outcome, ICU mortality, arrhythmia/rearrest | Seed MAP target evidence statement and localize exact threshold from source before import | `NOT_SET` |  | `FINAL_TOPIC` | `ilcor-map-target`, `erc-esicm-2025-post-resus` |
| `pico-post-rosc-mcs` | `sec-post-rosc` | PICO | Adults with cardiogenic shock after ROSC | Mechanical circulatory support device | No MCS/usual care | Survival, neurological outcome, shock resolution, complications | Seed as post-ROSC cardiogenic shock evidence summary with selection and resource constraints | `NOT_SET` |  | `FINAL_TOPIC` | `ilcor-2024-post-rosc-mcs`, `erc-esicm-2025-post-resus` |
| `pico-post-rosc-vasopressor-choice` | `sec-post-rosc` | PICO | Adults after sustained ROSC requiring vasopressor infusion | Specific vasopressor or combination | No vasopressor or different vasopressor | MAP achievement, survival, neurological outcome, arrhythmia | Seed as insufficient-evidence topic for vasopressor choice after cardiac arrest | `NOT_SET` |  | `FINAL_TOPIC` | `ilcor-post-rosc-vasopressor-choice`, `erc-esicm-2025-post-resus` |
| `pico-periarrest-tachyarrhythmia-cardioversion` | `sec-periarrest-arrhythmias` | Practice statement | Adults with unstable tachyarrhythmia or immediately post-ROSC tachyarrhythmia | Synchronized electrical cardioversion | Pharmacological therapy first or delayed cardioversion | Rhythm conversion, hemodynamic stabilization, sedation risks | Use synchronized cardioversion for unstable tachyarrhythmia; include ERC energy and drug sequence details | `NOT_SET` |  | `FINAL_GUIDELINE_STATEMENT` | `erc-2025-als-guideline` |

## Outcome Templates

Use a common outcome vocabulary to keep the seed navigable.

| Outcome Key Suffix | Title | Type | Importance | Notes |
| --- | --- | --- | ---: | --- |
| `fav-neuro-discharge-30d` | Survival with favourable neurological/functional outcome at discharge or 30 days | `DICHOTOMOUS` | 9 | Critical outcome in most ILCOR PICOSTs |
| `survival-discharge-30d` | Survival to hospital discharge or 30 days | `DICHOTOMOUS` | 9 | Critical outcome |
| `long-term-survival-neuro` | Long-term survival or favourable neurological outcome | `DICHOTOMOUS` | 8 | Use for 90 days, 180 days, or 1 year when reported |
| `rosc` | Return of spontaneous circulation | `DICHOTOMOUS` | 7 | Important outcome |
| `hrqol` | Health-related quality of life | `NARRATIVE` | 7 | Include if source reports or lists as PICOST outcome |
| `adverse-events` | Adverse events and treatment harms | `NARRATIVE` | 8 | Bleeding, airway events, interruptions, device complications |
| `process-time-to-treatment` | Time to treatment or process outcome | `CONTINUOUS` | 5 | Useful for route/device/logistics topics |
| `resource-feasibility` | Resource use and feasibility | `NARRATIVE` | 6 | Link to EtD rather than clinical-effect table when appropriate |

For PICOs without extractable numeric effects, create narrative outcomes with `certaintyOverall` populated when known and `gradeFootnotes` explaining that effect-size extraction remains pending.

## Recommendation Mapping

Map source wording to OpenGRADE enums conservatively:

| Source Wording | `strength` | `recommendationType` |
| --- | --- | --- |
| "We recommend..." for intervention | `STRONG_FOR` | `GRADE` |
| "We suggest..." for intervention | `CONDITIONAL_FOR` | `GRADE` |
| "We recommend against..." routine use | `STRONG_AGAINST` | `GRADE` |
| "We suggest against..." routine use | `CONDITIONAL_AGAINST` | `GRADE` |
| "Insufficient evidence to recommend for or against" | `NOT_SET` | `NO_LABEL` |
| ERC algorithm statement or good practice statement | `NOT_SET` unless direction is explicit | `PRACTICE_STATEMENT` |
| ERC writing-group consensus without formal GRADE | `NOT_SET` unless direction is explicit | `CONSENSUS` |

Set `recStatus` to `NEW` for the first seed version, except topics updated by 2026 draft pages can be `UPDATED_EVIDENCE` with `fhirMeta.evidenceStatus: "DRAFT_PUBLIC_COMMENT"`.

## EtD Template

Use `TWELVE_FACTOR` mode for the guideline and create EtD factors for all GRADE recommendations. For practice statements, create EtD only when implementation risk is non-trivial.

Recommended factor defaults:

| Factor | Required For | Seed Content |
| --- | --- | --- |
| `DESIRABLE_EFFECTS` | All GRADE recommendations | Summarize effect direction on survival, neurological outcome, ROSC |
| `UNDESIRABLE_EFFECTS` | All GRADE recommendations | Bleeding, interruptions, airway/device complications, delay risks |
| `CERTAINTY_OF_EVIDENCE` | All GRADE recommendations | Use source certainty and downgrade reasons |
| `BALANCE` | All GRADE recommendations | Net judgement, especially where evidence is indirect |
| `RESOURCES_REQUIRED` | Devices, drugs, ECPR, thrombolysis, REBOA | Cost, equipment, staffing, cold-chain/storage |
| `EQUITY` | ECPR, mechanical devices, ALS in low-resource settings | Access and system-level distribution concerns |
| `ACCEPTABILITY` | Drugs, devices, practice changes | Clinician/patient/public acceptability notes |
| `FEASIBILITY` | All implementation-sensitive records | Training, time-critical workflow, setting constraints |
| `PREFERENCES_VALUES` | Patient-facing tradeoffs | Survival with good neurological outcome, dignity, advance care plans |
| `COST_EFFECTIVENESS` | ECPR, MCS, mechanical devices, thrombolysis | Explicitly state when not reported |
| `QUALITY_OF_EVIDENCE` | Legacy seven-factor compatibility | Mirror `CERTAINTY_OF_EVIDENCE` |
| `BENEFITS_HARMS` | Legacy seven-factor compatibility | Mirror desirable/undesirable/balance summary |

Examples:

- ECPR: possible large benefit in highly selected refractory arrest, very high resource requirement, limited feasibility, equity concerns, selected-system implementation only.
- Thrombolysis: no demonstrated routine benefit in undifferentiated arrest, bleeding harm signal, non-trivial drug cost and storage, PE exception handled in special circumstances.
- Mechanical CPR: no routine outcome advantage, feasible when manual CPR is unsafe or impractical, training required to avoid compression interruptions.
- IM epinephrine: earlier administration process signal, very low certainty, evidence limited to observational adult OHCA data, do not implement as standard care.

## Tags

Create these tags and link them to recommendations:

| Tag | Color | Use |
| --- | --- | --- |
| `erc-2025` | `#1f5f99` | Final ERC 2025 guideline-facing content |
| `ilcor-2025` | `#3b7f2a` | Final ILCOR 2025 CoSTR or 2025 topic pages |
| `ilcor-2026-draft` | `#b36b00` | Draft/public-comment 2026 CoSTR topics |
| `final-guidance` | `#316dca` | Recommendation derived from final guideline/CoSTR |
| `draft-evidence` | `#d97706` | Evidence not final; review before clinical use |
| `practice-statement` | `#6b7280` | Good practice or consensus statement |
| `airway-ventilation` | `#0f766e` | Airway, oxygen, ventilation |
| `defibrillation` | `#be123c` | Electrical therapy |
| `drugs-fluids` | `#7c3aed` | Vascular access, drugs, fluids |
| `devices-ecpr` | `#334155` | Mechanical CPR, ECPR, REBOA, MCS |
| `post-rosc` | `#0369a1` | Post-resuscitation care |
| `special-circumstances` | `#854d0e` | Reversible/special causes |

## Example Seed Record

This example shows the desired structure. Use generated UUIDs during import, not these keys as database IDs.

```yaml
picos:
  - key: pico-oxygen-during-cpr
    population: "Adults with cardiac arrest in any setting."
    intervention: "Administer the highest feasible inspired oxygen concentration during CPR."
    comparator: "No supplemental oxygen or a reduced oxygen concentration during CPR."
    importSource: MANUAL
    narrativeSummary:
      type: doc
      content:
        - type: paragraph
          content:
            - type: text
              text: "Draft ILCOR 2026 evidence found no direct studies comparing oxygen dose strategies during CPR; available observational evidence is indirect."
    fhirMeta:
      sourceStatus: DRAFT_PUBLIC_COMMENT
      sourceKeys:
        - ilcor-2026-oxygen-cpr
        - erc-2025-als-guideline
    outcomes:
      - key: outcome-oxygen-fav-neuro-discharge-30d
        title: "Survival with favourable neurological/functional outcome at discharge or 30 days"
        outcomeType: DICHOTOMOUS
        state: UNDER_DEVELOPMENT
        ordering: 10
        importance: 9
        certaintyOverall: VERY_LOW
        indirectness: SERIOUS
        imprecision: SERIOUS
        plainLanguageSummary: "The evidence is indirect; all included studies used high inspired oxygen and compared measured oxygen levels rather than assigned oxygen strategies."
      - key: outcome-oxygen-rosc
        title: "Return of spontaneous circulation"
        outcomeType: DICHOTOMOUS
        state: UNDER_DEVELOPMENT
        ordering: 20
        importance: 7
        certaintyOverall: VERY_LOW
recommendations:
  - key: rec-oxygen-during-cpr
    title: "Oxygen during CPR"
    description:
      type: doc
      content:
        - type: paragraph
          content:
            - type: text
              text: "Use the highest feasible inspired oxygen concentration during CPR in adults with cardiac arrest."
    strength: CONDITIONAL_FOR
    recommendationType: GRADE
    certaintyOfEvidence: VERY_LOW
    recStatus: UPDATED_EVIDENCE
    rationale:
      type: doc
      content:
        - type: paragraph
          content:
            - type: text
              text: "The recommendation is based on draft ILCOR 2026 evidence and should be reviewed after final publication."
    fhirMeta:
      sourceStatus: DRAFT_PUBLIC_COMMENT
      sourceKeys:
        - ilcor-2026-oxygen-cpr
    etdFactors:
      - factorType: DESIRABLE_EFFECTS
        summaryText:
          type: doc
          content:
            - type: paragraph
              content:
                - type: text
                  text: "Indirect observational evidence associates higher measured arterial oxygen during CPR with better outcomes, but no trial assigned oxygen dose."
      - factorType: CERTAINTY_OF_EVIDENCE
        summaryText:
          type: doc
          content:
            - type: paragraph
              content:
                - type: text
                  text: "Very low certainty due to indirectness and observational design."
links:
  sectionPicos:
    - sectionKey: sec-airway-ventilation
      picoKey: pico-oxygen-during-cpr
      ordering: 10
  sectionRecommendations:
    - sectionKey: sec-airway-ventilation
      recommendationKey: rec-oxygen-during-cpr
      ordering: 10
  picoRecommendations:
    - picoKey: pico-oxygen-during-cpr
      recommendationKey: rec-oxygen-during-cpr
  outcomeReferences:
    - outcomeKey: outcome-oxygen-fav-neuro-discharge-30d
      referenceKey: ilcor-2026-oxygen-cpr
```

## Import Constraints

Current `POST /guidelines/import` imports guideline metadata, sections, and references only. It does not currently import PICOs, outcomes, recommendations, EtD, tags, practical issues, EMR elements, or join rows. A future seed importer must implement the full package contract before this seed can be loaded.

Importer requirements:

- Wrap the whole import in a single Prisma transaction.
- Create parent rows before child rows: organization/users, guideline, permissions, sections, references, PICOs/outcomes, recommendations/EtD, tags, then link tables.
- Topologically sort sections by `parentKey` and enforce maximum nesting level 2 for a total of three visible levels.
- Treat all `ordering` fields as non-negative integers.
- Treat outcome `importance` as the 1-9 GRADE importance scale.
- Preserve source status in `fhirMeta.sourceStatus`.
- Prevent `isPublic: true` until at least one `GuidelineVersion` is imported or published.
- Validate uniqueness for `User.keycloakId`, `User.email`, `Guideline.shortName`, organization membership pairs, guideline-user permission pairs, `EtdFactor(recommendationId,factorType)`, `Tag(guidelineId,name)`, and all join-table composite keys.
- Run post-import validation equivalent to `GET /guidelines/:id/validate` and fail on orphaned links, PICOs without outcomes, recommendations without section placement, or outcomes missing `certaintyOverall` when the source provides it.

## Pre-Import Review Checklist

Before writing this seed into OpenGRADE:

- Confirm no final ERC 2026 adult ALS update has superseded ERC 2025.
- Re-check all ILCOR 2026 draft/public-comment pages for final publication status.
- Replace draft extraction-aid references with final journal citations where available.
- Extract exact numeric effect estimates only where source licensing and access allow.
- Confirm every recommendation has at least one linked source.
- Confirm every PICO has at least one outcome and one section placement.
- Confirm every recommendation has `sourceStatus` and `sourceKeys`.
- Keep `isPublic: false` for this initial seed.
- Run importer in a staging database before any production OpenGRADE import.

## Known Gaps

- Exact effect-size extraction is intentionally incomplete; this spec prioritizes package structure, source mapping, and recommendation coverage.
- Several 2026 CoSTR pages were draft/public-comment at the research cutoff and require re-checking before import.
- The final 2025 ILCOR ALS publication is available through DOI/journal records, but the source appendices may remain easier to parse from the ILCOR preprint package. Treat those appendices as extraction aids, not citation authorities.
- The current importer does not yet support the full domain package needed for this seed.
