// ─── Contractor profile completion ───────────────────────────────
// Returns { pct: 0-100, missing: string[], fields: [...] }

const COMPLETION_FIELDS = [
  { key: 'license_number',         label: 'PCAB License Number',   weight: 25 },
  { key: 'license_classification', label: 'PCAB Classification',   weight: 20 },
  { key: 'specializations',        label: 'Specializations',        weight: 25, check: (v) => Array.isArray(v) ? v.length > 0 : !!v },
  { key: 'years_experience',       label: 'Years of Experience',    weight: 20 },
  { key: 'location_region',        label: 'Operating Region',       weight: 10 },
];

export function getContractorCompletion(profile) {
  let pct     = 0;
  const missing = [];
  const fields  = [];

  for (const f of COMPLETION_FIELDS) {
    const val    = profile?.[f.key];
    const filled = f.check
      ? f.check(val)
      : val !== null && val !== undefined && val !== '';

    if (filled) {
      pct += f.weight;
    } else {
      missing.push(f.label);
    }
    fields.push({ ...f, filled });
  }

  return { pct, missing, fields };
}
