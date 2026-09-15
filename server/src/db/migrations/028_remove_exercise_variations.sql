-- Keep user-created variation content by promoting every embedded variation
-- to a normal exercise before removing the feature. Old workout sets that
-- selected one are pointed at the promoted exercise, so their name, image
-- and defaults continue to work without variation-aware application code.
INSERT OR IGNORE INTO exercises (
  id, user_id, name, aliases, category, muscle_groups, equipment,
  collection_id, collection_name, collection_order, difficulty, log_type,
  default_sets, default_reps, default_duration, default_weight,
  default_distance, seconds_per_rep, unilateral, execution_directions,
  progression, instructions, video_url, image_url, updated_at, deleted_at,
  synced_at
)
SELECT
  exercises.id || '::former-variation::' || json_extract(item.value, '$.id'),
  user_id,
  json_extract(item.value, '$.name'),
  NULL,
  category,
  muscle_groups,
  COALESCE(json_extract(item.value, '$.equipment'), equipment),
  collection_id,
  collection_name,
  collection_order,
  COALESCE(json_extract(item.value, '$.difficulty'), difficulty),
  log_type,
  COALESCE(json_extract(item.value, '$.defaultSets'), default_sets),
  COALESCE(json_extract(item.value, '$.defaultReps'), default_reps),
  COALESCE(json_extract(item.value, '$.defaultDuration'), default_duration),
  COALESCE(json_extract(item.value, '$.defaultWeight'), default_weight),
  default_distance,
  seconds_per_rep,
  unilateral,
  execution_directions,
  progression,
  COALESCE(json_extract(item.value, '$.instructions'), instructions),
  video_url,
  COALESCE(json_extract(item.value, '$.imageUrl'), image_url),
  updated_at,
  deleted_at,
  synced_at
FROM exercises, json_each(exercises.variations) AS item
WHERE exercises.variations IS NOT NULL
  AND json_valid(exercises.variations)
  AND json_extract(item.value, '$.id') IS NOT NULL
  AND json_extract(item.value, '$.name') IS NOT NULL;

UPDATE workouts AS workout
SET sets = (
  SELECT json_group_array(json(
    CASE WHEN json_extract(item.value, '$.variationId') IS NULL THEN item.value
    ELSE json_set(
      json_remove(item.value, '$.variationId'),
      '$.exerciseId',
      json_extract(item.value, '$.exerciseId') || '::former-variation::' || json_extract(item.value, '$.variationId')
    ) END
  ))
  FROM json_each(workout.sets) AS item
)
WHERE json_valid(workout.sets)
  AND EXISTS (
    SELECT 1 FROM json_each(workout.sets)
    WHERE json_extract(value, '$.variationId') IS NOT NULL
  );

ALTER TABLE exercises DROP COLUMN variations;
