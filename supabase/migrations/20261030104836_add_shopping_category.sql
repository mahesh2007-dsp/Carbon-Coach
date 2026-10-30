-- Extend the category constraint to include 'shopping'
ALTER TABLE public.carbon_activities
  DROP CONSTRAINT IF EXISTS carbon_activities_category_check;

ALTER TABLE public.carbon_activities
  ADD CONSTRAINT carbon_activities_category_check
  CHECK (category IN ('travel', 'electricity', 'food', 'waste', 'shopping'));
