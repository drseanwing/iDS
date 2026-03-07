import { Injectable } from '@nestjs/common';

// TODO: Replace stub with BioPortal API proxy + Redis cache for real terminology lookups.
// BioPortal endpoint: https://data.bioontology.org/search?q={query}&ontologies={ontology}&pagesize={limit}
// Cache results in Redis with TTL of ~24h to avoid hammering the API.

export interface TerminologyResult {
  code: string;
  display: string;
  system: string;
}

export interface TerminologySearchResult {
  results: TerminologyResult[];
}

const STUB_CODES: Record<string, TerminologyResult[]> = {
  SNOMED_CT: [
    { code: '44054006', display: 'Diabetes mellitus type 2', system: 'SNOMED_CT' },
    { code: '73211009', display: 'Diabetes mellitus', system: 'SNOMED_CT' },
    { code: '38341003', display: 'Hypertension', system: 'SNOMED_CT' },
    { code: '195967001', display: 'Asthma', system: 'SNOMED_CT' },
    { code: '13645005', display: 'Chronic obstructive pulmonary disease', system: 'SNOMED_CT' },
    { code: '22298006', display: 'Myocardial infarction', system: 'SNOMED_CT' },
    { code: '230690007', display: 'Stroke', system: 'SNOMED_CT' },
    { code: '49436004', display: 'Atrial fibrillation', system: 'SNOMED_CT' },
    { code: '84114007', display: 'Heart failure', system: 'SNOMED_CT' },
    { code: '254837009', display: 'Breast cancer', system: 'SNOMED_CT' },
    { code: '363346000', display: 'Cancer', system: 'SNOMED_CT' },
    { code: '56265001', display: 'Heart disease', system: 'SNOMED_CT' },
    { code: '73211009', display: 'Diabetes mellitus type 1', system: 'SNOMED_CT' },
    { code: '40930008', display: 'Hypothyroidism', system: 'SNOMED_CT' },
    { code: '34486009', display: 'Hyperthyroidism', system: 'SNOMED_CT' },
    { code: '271737000', display: 'Anaemia', system: 'SNOMED_CT' },
    { code: '77386006', display: 'Pregnancy', system: 'SNOMED_CT' },
    { code: '70995007', display: 'Pulmonary hypertension', system: 'SNOMED_CT' },
    { code: '53741008', display: 'Coronary artery disease', system: 'SNOMED_CT' },
    { code: '44054006', display: 'Type 2 diabetes mellitus', system: 'SNOMED_CT' },
  ],
  ICD10: [
    { code: 'E11', display: 'Type 2 diabetes mellitus', system: 'ICD10' },
    { code: 'E10', display: 'Type 1 diabetes mellitus', system: 'ICD10' },
    { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD10' },
    { code: 'J45', display: 'Asthma', system: 'ICD10' },
    { code: 'J44', display: 'Chronic obstructive pulmonary disease', system: 'ICD10' },
    { code: 'I21', display: 'Acute myocardial infarction', system: 'ICD10' },
    { code: 'I50', display: 'Heart failure', system: 'ICD10' },
    { code: 'I48', display: 'Atrial fibrillation and flutter', system: 'ICD10' },
    { code: 'I63', display: 'Cerebral infarction (stroke)', system: 'ICD10' },
    { code: 'C50', display: 'Malignant neoplasm of breast', system: 'ICD10' },
    { code: 'C34', display: 'Malignant neoplasm of bronchus and lung', system: 'ICD10' },
    { code: 'E78', display: 'Disorders of lipoprotein metabolism and other lipidemias', system: 'ICD10' },
    { code: 'N18', display: 'Chronic kidney disease', system: 'ICD10' },
    { code: 'F32', display: 'Depressive episode', system: 'ICD10' },
    { code: 'F41', display: 'Anxiety disorders', system: 'ICD10' },
    { code: 'M79.3', display: 'Panniculitis', system: 'ICD10' },
    { code: 'K21', display: 'Gastro-oesophageal reflux disease', system: 'ICD10' },
    { code: 'E03', display: 'Hypothyroidism', system: 'ICD10' },
    { code: 'D50', display: 'Iron deficiency anaemia', system: 'ICD10' },
    { code: 'I25', display: 'Chronic ischaemic heart disease', system: 'ICD10' },
  ],
  ATC: [
    { code: 'A10BA02', display: 'Metformin', system: 'ATC' },
    { code: 'A10BB01', display: 'Glibenclamide', system: 'ATC' },
    { code: 'A10BJ01', display: 'Exenatide', system: 'ATC' },
    { code: 'A10BK01', display: 'Dapagliflozin', system: 'ATC' },
    { code: 'C09AA01', display: 'Captopril', system: 'ATC' },
    { code: 'C09AA02', display: 'Enalapril', system: 'ATC' },
    { code: 'C09CA01', display: 'Losartan', system: 'ATC' },
    { code: 'C07AB02', display: 'Metoprolol', system: 'ATC' },
    { code: 'C08CA01', display: 'Amlodipine', system: 'ATC' },
    { code: 'C10AA01', display: 'Simvastatin', system: 'ATC' },
    { code: 'C10AA05', display: 'Atorvastatin', system: 'ATC' },
    { code: 'B01AC06', display: 'Aspirin (antiplatelet)', system: 'ATC' },
    { code: 'B01AA03', display: 'Warfarin', system: 'ATC' },
    { code: 'B01AF01', display: 'Rivaroxaban', system: 'ATC' },
    { code: 'N02BE01', display: 'Paracetamol', system: 'ATC' },
    { code: 'M01AE01', display: 'Ibuprofen', system: 'ATC' },
    { code: 'J01CA04', display: 'Amoxicillin', system: 'ATC' },
    { code: 'R03AC02', display: 'Salbutamol', system: 'ATC' },
    { code: 'R03BA02', display: 'Budesonide (inhaled)', system: 'ATC' },
    { code: 'H02AB06', display: 'Prednisolone', system: 'ATC' },
  ],
  RXNORM: [
    { code: '6809', display: 'Metformin', system: 'RXNORM' },
    { code: '41493', display: 'Glipizide', system: 'RXNORM' },
    { code: '274783', display: 'Insulin glargine', system: 'RXNORM' },
    { code: '1373458', display: 'Empagliflozin', system: 'RXNORM' },
    { code: '1372029', display: 'Dapagliflozin', system: 'RXNORM' },
    { code: '1860484', display: 'Semaglutide', system: 'RXNORM' },
    { code: '29046', display: 'Lisinopril', system: 'RXNORM' },
    { code: '83515', display: 'Losartan', system: 'RXNORM' },
    { code: '41493', display: 'Amlodipine', system: 'RXNORM' },
    { code: '36567', display: 'Simvastatin', system: 'RXNORM' },
    { code: '83367', display: 'Atorvastatin', system: 'RXNORM' },
    { code: '1191', display: 'Aspirin', system: 'RXNORM' },
    { code: '11289', display: 'Warfarin', system: 'RXNORM' },
    { code: '1114195', display: 'Rivaroxaban', system: 'RXNORM' },
    { code: '161', display: 'Acetaminophen (Paracetamol)', system: 'RXNORM' },
    { code: '5640', display: 'Ibuprofen', system: 'RXNORM' },
    { code: '723', display: 'Amoxicillin', system: 'RXNORM' },
    { code: '435', display: 'Albuterol (Salbutamol)', system: 'RXNORM' },
    { code: '1514', display: 'Budesonide', system: 'RXNORM' },
    { code: '8640', display: 'Prednisone', system: 'RXNORM' },
  ],
};

@Injectable()
export class TerminologyService {
  search(system: string, query: string, limit = 20): TerminologySearchResult {
    const candidates = STUB_CODES[system] ?? [];
    const q = query.toLowerCase();

    const results = candidates
      .filter((entry) => entry.display.toLowerCase().includes(q) || entry.code.includes(q))
      .slice(0, limit);

    return { results };
  }
}
