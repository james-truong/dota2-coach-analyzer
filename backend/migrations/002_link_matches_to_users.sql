-- Migration: Link existing analyzed matches to users by account_id
-- Date: 2026-01-03
-- Description: Updates analyzed_matches to set user_id based on account_id

-- Link all matches that have an account_id but no user_id
UPDATE analyzed_matches am
SET user_id = u.id
FROM users u
WHERE am.account_id = u.account_id
  AND am.user_id IS NULL;

-- Verify the update
SELECT
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as matches_with_user,
  COUNT(*) FILTER (WHERE user_id IS NULL) as matches_without_user,
  COUNT(*) as total_matches
FROM analyzed_matches;
