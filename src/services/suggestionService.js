// ─── AI Project Suggestion Engine ────────────────────────────────
// Scores each open project against a contractor's profile and returns
// the best matches ranked by relevance.

// Maps specializations to the project types they cover (primary first)
const SPEC_TO_TYPES = {
  'General Construction':      ['residential', 'commercial', 'industrial', 'renovation'],
  'Civil / Structural':        ['infrastructure', 'commercial', 'industrial'],
  'Electrical':                ['electrical', 'commercial', 'industrial'],
  'Plumbing / Sanitary':       ['plumbing', 'residential', 'commercial'],
  'Mechanical':                ['industrial', 'commercial'],
  'Interior Design / Fit-out': ['interior', 'residential', 'commercial'],
  'Road / Bridge':             ['infrastructure'],
  'Renovation':                ['renovation', 'residential', 'commercial'],
};

// PCAB license class → ideal budget range in PHP
const LICENSE_BUDGET = {
  AAA: { min: 50000000,  max: Infinity },
  AA:  { min: 15000000,  max: 150000000 },
  A:   { min: 5000000,   max: 50000000 },
  B:   { min: 1000000,   max: 15000000 },
  C:   { min: 500000,    max: 5000000 },
  D:   { min: 100000,    max: 1000000 },
  E:   { min: 0,         max: 500000 },
};

export function scoreProject(project, contractor) {
  const specs      = Array.isArray(contractor.specializations)
    ? contractor.specializations
    : (contractor.specializations ? JSON.parse(contractor.specializations) : []);
  const type       = project.project_type;
  const avgBudget  = (Number(project.budget_min) + Number(project.budget_max)) / 2;
  const years      = Number(contractor.years_experience) || 0;
  const licClass   = contractor.license_classification || '';

  let score = 0;

  // ── 1. Specialization match (50 pts) ──────────────────────────
  let specScore = 0;
  for (const spec of specs) {
    const covered = SPEC_TO_TYPES[spec] || [];
    if (covered[0] === type) {
      specScore = 50;   // primary specialization — perfect match
      break;
    } else if (covered.includes(type)) {
      specScore = Math.max(specScore, 28); // secondary match
    }
  }
  score += specScore;

  // ── 2. Same region (20 pts) ───────────────────────────────────
  if (
    contractor.location_region &&
    project.location_region === contractor.location_region
  ) {
    score += 20;
  }

  // ── 3. Experience vs budget scale (15 pts) ────────────────────
  if      (avgBudget >= 10000000 && years >= 10) score += 15;
  else if (avgBudget >= 3000000  && years >= 5)  score += 15;
  else if (avgBudget >= 500000   && years >= 2)  score += 15;
  else if (avgBudget < 500000)                   score += 12; // entry-level project
  else                                           score += 5;

  // ── 4. License class fits budget (15 pts) ────────────────────
  const range = LICENSE_BUDGET[licClass];
  if (range && avgBudget >= range.min && avgBudget <= range.max) {
    score += 15;
  } else if (range) {
    score += 5; // wrong tier but still licensed
  } else {
    score += 8; // no license info, neutral
  }

  return Math.min(Math.round(score), 100);
}

// Returns top `limit` projects scored ≥ 30%, sorted by score desc
export function getSuggestedProjects(projects, contractor, limit = 4) {
  if (!contractor) return [];
  return projects
    .map((p) => ({ ...p, matchScore: scoreProject(p, contractor) }))
    .filter((p) => p.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function matchLabel(score) {
  if (score >= 80) return { text: 'Excellent Match', color: '#10B981' };
  if (score >= 60) return { text: 'Good Match',      color: '#28A5FF' };
  if (score >= 40) return { text: 'Fair Match',      color: '#F59E0B' };
  return               { text: 'Low Match',          color: '#9CA3AF' };
}
