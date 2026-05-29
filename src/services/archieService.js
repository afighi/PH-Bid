/**
 * Archie AI Service — BuildBid PH
 * Claude Haiku 4.5 powers every module in the platform.
 * Dev: CRA setupProxy.js forwards /api/anthropic/* → Anthropic (key injected server-side)
 * Prod: replace API with a Supabase Edge Function URL via REACT_APP_ARCHIE_URL
 */
const API = process.env.REACT_APP_ARCHIE_URL || '/api/anthropic/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function archieHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.REACT_APP_ARCHIE_URL && SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

const BASE = `You are Archie, the AI assistant for BuildBid PH — a private construction bidding platform for the Philippines. You deeply understand Philippine construction industry practices, PCAB licensing, regional regulations, peso-denominated contracts, and local business culture. Be professional, direct, and practical. Always consider the Filipino business context: relationship-building matters, trust is paramount. Online payments are appropriate for: mobilization/advance fees (10-20%), milestone progress payments with proof, and retention releases — typically via GCash, Maya, or bank transfer up to ₱500,000 per transaction. Larger amounts require direct bank arrangements with proof of payment uploaded as acknowledgment.`;

async function call(systemAddition, userMessage, maxTokens = 800) {
  const res = await fetch(API, {
    method: 'POST',
    headers: archieHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemAddition ? `${BASE}\n\n${systemAddition}` : BASE,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Archie API ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// ─────────────────────────────────────────────────────────────────
// CLIENT MODULES
// ─────────────────────────────────────────────────────────────────

/** Conversational project creation assistant. Outputs PROJECT_DATA:{} when ready. */
export async function archieProjectCreation(messages, profile) {
  const system = `You are helping ${profile?.full_name || 'a client'} post a construction project. Ask for: project type, location, budget, timeline, scope, and special conditions. Once you have enough info, output PROJECT_DATA:{"title":"","description":"","project_type":"","location_city":"","location_region":"","budget_min":0,"budget_max":0,"scope_of_work":"","special_conditions":""} at the end. Project types: Residential, Commercial, Industrial, Infrastructure, Renovation, Interior. Be conversational and helpful.`;
  const conv = messages.map(m => `${m.role === 'user' ? 'Client' : 'Archie'}: ${m.content}`).join('\n');
  return call(system, conv || 'I want to post a construction project.', 1000);
}

/** Analyzes and ranks all bids on a project. Returns JSON ranking. */
export async function archieAnalyzeBids(project, bids, contractors) {
  const system = `Analyze construction bids objectively. Output ONLY valid JSON:
{"summary":"","recommended_bid_id":"uuid or null","recommendation_reason":"","rankings":[{"bid_id":"","rank":1,"score":85,"pros":[],"cons":[],"risk_level":"low|medium|high","price_assessment":"competitive|fair|overpriced|underpriced"}],"red_flags":[],"payment_advice":""}`;

  const bidLines = bids.map(b => {
    const c = contractors?.find(x => x.id === b.contractor_id);
    return `BID ${b.id}: ${c?.company_name || c?.full_name || 'Unknown'} | ₱${Number(b.bid_amount).toLocaleString()} | ${b.proposed_start_date}–${b.proposed_end_date} | Rating:${c?.average_rating||0}/5 | Projects:${c?.completed_projects||0} | "${b.cover_letter?.slice(0,150)}..."`;
  }).join('\n');

  return call(system, `PROJECT: ${project.title} | Budget ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()} | ${project.location_city}\n\nBIDS:\n${bidLines}\n\nRank these bids.`, 1200);
}

/** Deep review of a single bid for the client. */
export async function archieReviewBid(project, bid, contractor) {
  return call(
    `You are advising a client on a specific bid. Use markdown headers for: ## Price Analysis, ## Timeline, ## Contractor Credibility, ## Payment Terms, ## Recommendation`,
    `PROJECT: ${project.title} | Budget ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()}
CONTRACTOR: ${contractor?.full_name} | ${contractor?.company_name} | ${contractor?.years_experience||0} yrs | Rating ${contractor?.average_rating||0}/5 | PCAB: ${contractor?.pcab_classification||'N/A'}
BID: ₱${Number(bid.bid_amount).toLocaleString()} | ${bid.proposed_start_date}–${bid.proposed_end_date}
Cover Letter: ${bid.cover_letter}
Technical: ${bid.technical_proposal || 'Not provided'}
Payment Terms: ${bid.payment_terms || 'Not specified'}`,
    900
  );
}

/** Suggests an answer to a contractor's Q&A question. */
export async function archieSuggestAnswer(project, question) {
  return call(
    `Help a client answer a contractor's clarification question. The answer will be PUBLIC to all bidders. Be precise, professional, 2-4 sentences.`,
    `PROJECT: ${project.title}\nScope: ${project.scope_of_work || project.description}\nBudget: ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()}\n\nQUESTION: "${question}"\n\nSuggest a professional answer.`,
    400
  );
}

/** Reviews milestone evidence before client approves payment. Returns JSON verdict. */
export async function archieCheckMilestone(contract, milestone, progressUpdate) {
  return call(
    `Review milestone completion evidence. Output ONLY JSON: {"verdict":"approve|request_more_info|dispute","confidence":85,"checklist":[{"item":"","status":"pass|fail|unclear"}],"payment_recommendation":"","client_action":""}`,
    `CONTRACT: ₱${Number(contract.contract_amount).toLocaleString()}
MILESTONE: ${milestone.name} — ₱${Number(milestone.amount||0).toLocaleString()} (${milestone.percentage||0}% of contract)
Expected scope: ${milestone.description || 'Not specified'}
UPDATE TITLE: ${progressUpdate?.update_title || 'None'}
UPDATE DESC: ${progressUpdate?.update_description || 'None'}
COMPLETION %: ${progressUpdate?.percentage_complete || 0}%
PHOTOS: ${progressUpdate?.photo_urls?.length || 0}`,
    600
  );
}

/** Drafts a client review of a contractor. */
export async function archieDraftReview(project, contractor, ratings) {
  return call(
    `Help a client write a professional, honest, balanced 2-3 sentence review of a contractor.`,
    `PROJECT: ${project.title} | CONTRACTOR: ${contractor?.company_name||contractor?.full_name}
Ratings — Overall: ${ratings.overall}/5, Quality: ${ratings.quality}/5, Communication: ${ratings.communication}/5, Timeliness: ${ratings.timeliness}/5`,
    300
  );
}

// ─────────────────────────────────────────────────────────────────
// CONTRACTOR MODULES
// ─────────────────────────────────────────────────────────────────

/** Scores how well a project matches the contractor. Returns JSON. */
export async function archieProjectFit(project, profile) {
  return call(
    `Assess project-contractor fit. Output ONLY JSON: {"fit_score":85,"fit_level":"excellent|good|fair|poor","summary":"","strengths":[],"challenges":[],"recommended_bid_range":{"min":0,"max":0},"key_risks":[],"should_bid":true}`,
    `CONTRACTOR: ${profile.company_name} | Specializations: ${profile.specializations?.join(', ')||'General'} | ${profile.years_experience||0} yrs | Rating ${profile.average_rating||0}/5 | PCAB: ${profile.pcab_classification||'N/A'} | Region: ${profile.company_region||profile.location_region||'NCR'}
PROJECT: ${project.title} | ${project.project_type} | ${project.location_city}, ${project.location_region} | ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()} | ${project.start_date}–${project.end_date}
Scope: ${project.scope_of_work||project.description}`,
    700
  );
}

/** Generates a complete bid proposal. Outputs PROPOSAL_DATA:{} JSON. */
export async function archieDraftProposal(project, profile, targetAmount) {
  const system = `Generate a professional bid proposal for a Philippine contractor. Output PROPOSAL_DATA:{"cover_letter":"3-4 professional paragraphs","technical_proposal":"methodology, QC, safety, materials","payment_terms":"mobilization 15%, milestone payments, 10% retention","milestones":[{"name":"","description":"","percentage":20,"days_from_start":30}]} at the end of your response. Include 4-6 realistic milestones for this project type.`;

  return call(
    system,
    `CONTRACTOR: ${profile.full_name} | ${profile.company_name} | ${profile.years_experience||0} yrs | PCAB: ${profile.pcab_classification||'General'} | License: ${profile.license_number||''}
Specializations: ${profile.specializations?.join(', ')||'General construction'}
PROJECT: ${project.title} | ${project.project_type} | ${project.location_city}, ${project.location_region}
Client Budget: ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()}
Timeline: ${project.start_date||'TBD'} to ${project.end_date||'TBD'}
Scope: ${project.scope_of_work||project.description}
Target Bid: ₱${targetAmount ? Number(targetAmount).toLocaleString() : 'not decided yet'}`,
    1400
  );
}

/** Suggests a competitive bid price. Returns JSON. */
export async function archieSuggestPrice(project, profile) {
  return call(
    `Suggest a competitive bid price for a Philippine contractor. Output ONLY JSON: {"recommended_bid":0,"range":{"conservative":0,"competitive":0,"aggressive":0},"reasoning":"","margin_hint":"overhead+profit typically X%","pricing_strategy":""}`,
    `CONTRACTOR: ${profile.company_name} | ${profile.years_experience||0} yrs | PCAB: ${profile.pcab_classification||'N/A'} | Region: ${profile.company_region||'NCR'}
PROJECT: ${project.title} | ${project.project_type} | Budget ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()} | ${project.location_city}, ${project.location_region}
Scope: ${project.scope_of_work||project.description}`,
    600
  );
}

/** Suggests 3 clarification questions for the contractor to ask the client. */
export async function archieContractorQuestions(project) {
  return call(
    `Suggest 3 specific, professional clarification questions a contractor should ask before bidding. Output OPTIONS:["question1","question2","question3"] at the end.`,
    `PROJECT: ${project.title} | ${project.project_type} | ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()}
Description: ${project.description}
Scope: ${project.scope_of_work||'See description'}`,
    400
  );
}

/** Drafts a change order request. Returns JSON fields. */
export async function archieDraftChangeOrder(contract, project, situation) {
  return call(
    `Draft a professional change order request for a Philippine construction contractor. Output ONLY JSON: {"title":"","description":"","justification":"","impact_cost_reasoning":"","impact_days_reasoning":""}`,
    `CONTRACT: ₱${Number(contract.contract_amount).toLocaleString()} | ${contract.start_date}–${contract.end_date}
PROJECT: ${project.title}
SITUATION: ${situation}`,
    700
  );
}

/** Helps contractor write a progress update. */
export async function archieWriteProgress(milestoneName, roughNotes, photoCount) {
  return call(
    `Help a contractor write a professional 3-4 sentence milestone progress update for their client. Be factual, clear, and reassuring.`,
    `MILESTONE: ${milestoneName}
ROUGH NOTES: ${roughNotes || 'Work completed as planned.'}
PHOTOS ATTACHED: ${photoCount}`,
    300
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED MODULES
// ─────────────────────────────────────────────────────────────────

/** Explains contract payment terms in plain language. */
export async function archieExplainPayment(contract, role) {
  return call(
    `Explain a construction contract's payment schedule in plain, friendly language for a ${role}. Explain what each payment means, when it's due, and what triggers it. Flag unusual terms.`,
    `CONTRACT: ₱${Number(contract.contract_amount).toLocaleString()} | ${contract.start_date}–${contract.end_date}
PAYMENT SCHEDULE: ${JSON.stringify(contract.payment_schedule||[])}
TERMS: ${contract.terms_and_conditions||'Standard'}`,
    600
  );
}

/** Mediates a dispute between client and contractor. */
export async function archieMediateDispute(project, contract, clientClaim, contractorClaim) {
  return call(
    `You are a neutral construction dispute mediator for the Philippines. Review both claims fairly. Provide: 1) Dispute summary, 2) Assessment of each side, 3) Recommended resolution, 4) Next steps. Be impartial.`,
    `PROJECT: ${project.title} | CONTRACT: ₱${Number(contract.contract_amount).toLocaleString()}
CLIENT'S CLAIM: ${clientClaim}
CONTRACTOR'S CLAIM: ${contractorClaim}`,
    800
  );
}

/** Coaches a side in bid negotiation. */
export async function archieNegotiationCoach(role, project, bid, history, goal) {
  return call(
    `You are a negotiation coach for Philippine construction contracts. Coach the ${role} professionally. Consider Filipino business culture — respect and relationship-building matter. Be strategic but ethical.`,
    `PROJECT: ${project.title} | Budget ₱${Number(project.budget_min).toLocaleString()}–₱${Number(project.budget_max).toLocaleString()}
CURRENT BID: ₱${Number(bid.bid_amount).toLocaleString()}
NEGOTIATION HISTORY: ${history}
GOAL: ${goal}
Draft a professional response message.`,
    500
  );
}

// ─────────────────────────────────────────────────────────────────
// PLATFORM KNOWLEDGE — shared across all chat functions
// ─────────────────────────────────────────────────────────────────

function buildRoleKnowledge(role) {
  const client = `
CLIENT CAPABILITIES & PAGES:
- Post a new project → /client/new-project (ask for: title, type, location, budget, deadline, scope)
- View all my projects → /client/projects (filter by status, budget, region, deadline)
- View bids on a project → /client/projects/{id}/bids (compare bids, award winner)
- Project detail → /client/projects/{id}
- Contracts → /client/contracts (view and sign contracts after awarding a bid)
- Payments & transactions → /client/transactions
- Messages → /client/messages
- Disputes → /client/disputes (file against contractor for awarded/active projects)
- Referrals → /client/referrals (invite others, track sign-ups)
- Profile → /client/profile
- Settings → /client/settings

CLIENT PAYMENT FLOW (step by step):
1. Post a project and set a budget range
2. Contractors submit bids — client receives Firebase notification instantly
3. Client reviews bids at /client/projects/{id}/bids — compare amount, timeline, contractor rating
4. Client awards the best bid — all other bids auto-rejected, contractor notified
5. Client clicks "Contract" button next to awarded bid — generates a contract with scope, dates, payment terms
6. Both parties sign the contract digitally in the platform
7. Client pays milestone by milestone via /client/transactions — supported methods: GCash, Maya, bank transfer, cash (up to ₱500,000 per online transaction; larger amounts via direct bank)
8. For each milestone: client reviews contractor's progress update and photos, then approves → payment releases
9. Final payment releases when project is marked Completed
10. After completion, client leaves a review for the contractor

PAYMENT TIPS FOR CLIENTS:
- Standard advance/mobilization fee: 10–20% of contract amount — pay this first to let contractor start
- Always pay through the platform so there's a paper trail
- If contractor doesn't meet a milestone, click "Dispute" before releasing payment
- 10% retention is typically held until final completion
`;

  const contractor = `
CONTRACTOR CAPABILITIES & PAGES:
- Browse open projects → /contractor/browse (filter by type, region, budget; bookmark; compare up to 3)
- Saved/watchlisted projects → /contractor/watchlist
- Submit or revise a bid → /contractor/projects/{id}/bid (use Archie Bid Intelligence to draft proposal)
- My bids (track status) → /contractor/my-bids
- Earnings & performance → /contractor/earnings (total earned, win rate, bid breakdown, payments)
- Contracts → /contractor/contracts (view pending and active contracts, sign them)
- Payments received → /contractor/transactions
- Messages → /contractor/messages
- Disputes → /contractor/disputes (file against client for awarded/active projects)
- Portfolio → /contractor/profile (add past projects with photos to showcase work)
- Referrals → /contractor/referrals
- Profile & specializations → /contractor/profile
- Settings → /contractor/settings

CONTRACTOR PAYMENT FLOW (step by step):
1. Browse open projects and submit a competitive bid at /contractor/browse
2. If awarded, sign the contract at /contractor/contracts
3. Receive mobilization/advance payment from client (10–20%) — visible in /contractor/transactions
4. Submit progress updates with photos for each milestone
5. Client reviews and approves milestone → payment is released to contractor
6. Track all earnings at /contractor/earnings
7. Final payment releases on project completion
8. Leave a review for the client

PAYMENT TIPS FOR CONTRACTORS:
- Always wait for contract signature before starting work
- Upload progress photos — clients approve faster when they can see the work
- For milestone disputes, go to /contractor/disputes immediately (don't just message)
- GCash and Maya are fastest for receiving payments up to ₱500,000
- Larger payments require bank transfer — provide your account details in the contract
- Your average_rating directly affects how often clients shortlist you
`;

  const admin = `
ADMIN CAPABILITIES & PAGES:
- Dashboard overview → /admin (platform stats, pending approvals queue)
- User management → /admin (Users tab — approve/suspend/verify contractors)
- Project management → /admin (Projects tab)
- Transaction oversight → /admin (Transactions tab)
- Audit trail → /admin (Audit tab)
- Disputes → review and resolve all disputes across the platform
`;

  if (role === 'client')     return client;
  if (role === 'contractor') return contractor;
  if (role === 'admin')      return admin;
  return client + contractor;
}

function buildPaymentKnowledge() {
  return `
PAYMENT SYSTEM DETAILS:
- Payment gateway: PayMongo (Philippine payment processor)
- Supported methods: GCash, Maya (PayMaya), BDO/BPI/Metrobank bank transfer, online banking, check, cash
- Transaction limit per online payment: ₱500,000 — larger amounts require direct bank arrangements
- All transactions are logged and visible to both parties
- Milestone-based payments: money only releases after client approves the milestone
- Retention: typically 10% held until full project completion
- Dispute process: either party can file a dispute at /[role]/disputes — admin mediates
- Refunds: handled through admin — contact support@buildbid.ph

PAYMENT STATUSES:
- pending: payment initiated, not yet confirmed
- completed: payment confirmed and released
- disputed: held pending dispute resolution

HOW TO PAY (client):
1. Go to /client/transactions → click "Make Payment"
2. Select project and milestone
3. Choose payment method (GCash/Maya/bank)
4. Upload proof of payment if paying via bank transfer
5. Payment recorded immediately; contractor notified via Firebase

HOW TO RECEIVE PAYMENT (contractor):
1. Submit milestone progress update with photos
2. Client reviews and clicks "Approve Milestone"
3. Payment releases to your account
4. View all received payments at /contractor/transactions or /contractor/earnings
`;
}

// ─────────────────────────────────────────────────────────────────
// GENERAL DASHBOARD CHAT — used by floating ArchieChat panel
// ─────────────────────────────────────────────────────────────────
export async function askArchie(messages, role, profile, context = {}) {
  const stats  = context.stats  || {};
  const statsStr = Object.entries(stats).filter(([,v]) => v != null).map(([k,v]) => `${k}: ${v}`).join(' | ');

  const system = `You are Archie, the AI assistant for BuildBid PH — a Philippine construction bidding platform.
You are talking to: ${profile?.full_name || 'a user'} | Company: ${profile?.company_name || 'N/A'} | Role: ${role} | Status: ${profile?.status || 'active'}
${statsStr ? `Their current stats: ${statsStr}` : ''}

${buildRoleKnowledge(role)}
${buildPaymentKnowledge()}

BEHAVIOR RULES:
1. Be conversational, friendly, and practical. You know the Philippine construction industry well.
2. When the user wants to go somewhere or do something, include a navigation action at the end of your reply using exactly this format on its own line: NAVIGATE:/the/path
   Example: "You can view your bids here.\nNAVIGATE:/contractor/my-bids"
3. For "how do I pay", "how do payments work", "release payment" — give step-by-step instructions based on their role.
4. For "find projects" (contractor) — navigate to browse and explain filters.
5. For "post a project" (client) — navigate to new-project form.
6. For "create contract" — explain the contract flow and navigate to contracts page.
7. For "file a dispute" — explain when/how to dispute and navigate to disputes page.
8. Use OPTIONS:["option1","option2"] on a new line to suggest next steps (max 3 options).
9. Keep answers under 150 words unless a payment flow or step-by-step is requested.
10. Never make up data — only reference what is in the stats provided or general platform knowledge.`;

  const res = await fetch(API, {
    method: 'POST',
    headers: archieHeaders(),
    body: JSON.stringify({
      model: MODEL, max_tokens: 800, system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Archie ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export const buildSystemPrompt = () => BASE;

/** Alias: ArchieBanner welcome summary */
export async function getWelcomeSummary(role, profile, stats) {
  const ctxStr = stats ? Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
  return call(
    `You are Archie, the AI assistant for BuildBid PH. Generate a short, friendly 2-sentence welcome summary for a ${role} named ${profile?.full_name || 'there'}. Mention 1 specific actionable insight based on their stats. Be encouraging and direct — no fluff.`,
    `Role: ${role} | Company: ${profile?.company_name || 'N/A'} | Stats: ${ctxStr || 'No stats yet'}`,
    200
  );
}

/** Alias: ArchieChat message handler */
export async function chatWithArchie(messages, role, profile, stats) {
  return askArchie(messages, role, profile, stats ? { stats } : {});
}
