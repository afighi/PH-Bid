import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, push } from 'firebase/database';

export async function submitReview({ projectId, reviewerId, revieweeId, reviewerRole, rating, qualityRating, communicationRating, timelinessRating, reviewText }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      project_id:           projectId,
      reviewer_id:          reviewerId,
      reviewee_id:          revieweeId,
      reviewer_role:        reviewerRole,
      rating,
      quality_rating:       qualityRating       || null,
      communication_rating: communicationRating || null,
      timeliness_rating:    timelinessRating    || null,
      review_text:          reviewText          || null,
    })
    .select('*, reviewer:profiles!reviewer_id(full_name, company_name)')
    .single();

  if (error) throw new Error(error.message);

  const avg = Math.round((rating + (qualityRating || rating) + (communicationRating || rating) + (timelinessRating || rating)) / 4 * 10) / 10;
  const { data: existing } = await supabase
    .from('profiles')
    .select('average_rating, completed_projects')
    .eq('id', revieweeId)
    .single();

  const prev  = existing?.average_rating || 0;
  const count = existing?.completed_projects || 1;
  const newAvg = Math.round(((prev * (count - 1)) + avg) / count * 10) / 10;

  await supabase.from('profiles').update({ average_rating: newAvg }).eq('id', revieweeId);

  await push(ref(database, `notifications/${revieweeId}`), {
    type:       'new_review',
    title:      'You received a review',
    message:    `${data.reviewer?.company_name || data.reviewer?.full_name} left you a ${rating}-star review.`,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });

  return data;
}

export async function getReviewsForUser(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name, company_name, role), project:projects(title)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMyReviewForProject(projectId, reviewerId) {
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('project_id', projectId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  return data;
}
