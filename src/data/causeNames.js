// Plain-language labels for the NCHS "rankable" causes of death.
//
// The official 113 Selected Causes names are precise but carry ICD-10 code
// ranges and clinical phrasing — unreadable on a phone and needlessly
// opaque for a general audience. Keys are the exact `cause_name` values in
// /data/mortality.json (the 113-list label with the leading "#" stripped).
//
// Toggle between these and the official names with useNamePreference().

const FRIENDLY = {
  'Diseases of heart (I00-I09,I11,I13,I20-I51)': 'Heart disease',
  'Malignant neoplasms (C00-C97)': 'Cancer',
  'Cerebrovascular diseases (I60-I69)': 'Stroke',
  'Chronic lower respiratory diseases (J40-J47)': 'Chronic lung disease',
  'Accidents (unintentional injuries) (V01-X59,Y85-Y86)': 'Accidents',
  'Diabetes mellitus (E10-E14)': 'Diabetes',
  'Influenza and pneumonia (J09-J18)': 'Flu & pneumonia',
  'Alzheimer disease (G30)': "Alzheimer's disease",
  'Nephritis, nephrotic syndrome and nephrosis (N00-N07,N17-N19,N25-N27)': 'Kidney disease',
  'Septicemia (A40-A41)': 'Blood infection (sepsis)',
  'Intentional self-harm (suicide) (*U03,X60-X84,Y87.0)': 'Suicide',
  'Chronic liver disease and cirrhosis (K70,K73-K74)': 'Liver disease',
  'Essential hypertension and hypertensive renal disease (I10,I12,I15)': 'High blood pressure',
  'Assault (homicide) (*U01-*U02,X85-Y09,Y87.1)': 'Homicide',
  'Aortic aneurysm and dissection (I71)': 'Aortic aneurysm',
  'Pneumonitis due to solids and liquids (J69)': 'Aspiration pneumonia',
  'Atherosclerosis (I70)': 'Hardening of the arteries',
  'Human immunodeficiency virus (HIV) disease (B20-B24)': 'HIV / AIDS',
  'Parkinson disease (G20-G21)': "Parkinson's disease",
  'Certain conditions originating in the perinatal period (P00-P96)': 'Newborn conditions',
  'In situ neoplasms, benign neoplasms and neoplasms of uncertain or unknown behavior (D00-D48)':
    'Benign & other tumors',
  'Congenital malformations, deformations and chromosomal abnormalities (Q00-Q99)': 'Birth defects',
  'Viral hepatitis (B15-B19)': 'Viral hepatitis',
  'Peptic ulcer (K25-K28)': 'Stomach ulcers',
  'Anemias (D50-D64)': 'Anemia',
  'Nutritional deficiencies (E40-E64)': 'Malnutrition',
  'Cholelithiasis and other disorders of gallbladder (K80-K82)': 'Gallbladder disease',
  'Complications of medical and surgical care (Y40-Y84,Y88)': 'Medical & surgical complications',
  'Hernia (K40-K46)': 'Hernia',
  'Pneumoconioses and chemical effects (J60-J66,J68,U07.0)': 'Occupational lung disease',
  'Tuberculosis (A16-A19)': 'Tuberculosis',
  'Meningitis (G00,G03)': 'Meningitis',
  'Infections of kidney (N10-N12,N13.6,N15.1)': 'Kidney infection',
  'Enterocolitis due to Clostridium difficile (A04.7)': 'C. diff infection',
  'Hyperplasia of prostate (N40)': 'Enlarged prostate',
  'Pregnancy, childbirth and the puerperium (O00-O99)': 'Pregnancy & childbirth',
  'Legal intervention (Y35,Y89.0)': 'Legal intervention',
  'Diseases of appendix (K35-K38)': 'Appendicitis',
  'Acute bronchitis and bronchiolitis (J20-J21)': 'Acute bronchitis',
  'Meningococcal infection (A39)': 'Meningococcal disease',
  'Inflammatory diseases of female pelvic organs (N70-N76)': 'Pelvic inflammatory disease',
  'Salmonella infections (A01-A02)': 'Salmonella',
  'Syphilis (A50-A53)': 'Syphilis',
  'Operations of war and their sequelae (Y36,Y89.1)': 'War',
  'Shigellosis and amebiasis (A03,A06)': 'Shigella & amebiasis',
  'Whooping cough (A37)': 'Whooping cough',
  'Malaria (B50-B54)': 'Malaria',
  'Arthropod-borne viral encephalitis (A83-A84,A85.2)': 'Mosquito-borne encephalitis',
  'COVID-19 (U07.1)': 'COVID-19'
}

// Fallback for anything not curated: drop a trailing "(ICD codes)" group.
function stripCodes(name) {
  return name.replace(/\s*\([^()]*\)\s*$/, '').trim()
}

export function friendlyName(officialName) {
  return FRIENDLY[officialName] ?? stripCodes(officialName)
}

export function displayName(officialName, style) {
  return style === 'official' ? officialName : friendlyName(officialName)
}
