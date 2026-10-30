/*
# Create Carbon Coach activities table

1. New Tables
- `carbon_activities` stores each activity logged through the Carbon Coach conversation.
- `id` (uuid primary key) uniquely identifies the activity.
- `category` (text) identifies travel, electricity, food, or waste.
- `label` (text) is the human-readable activity name.
- `quantity` (numeric) stores the measured amount used for the calculation.
- `unit` (text) stores the quantity unit such as km, kWh, meal, or item.
- `emissions_kg` (numeric) stores the calculated kilograms of CO2e.
- `created_at` (timestamptz) records when the activity was logged.

2. Security
- Row level security is enabled.
- This is intentionally a no-sign-in, single-tenant demo, so the anon and authenticated roles can manage the shared activity timeline.
- Separate CRUD policies are created for the Data API.

3. Important Notes
- Emissions are calculated in the application from documented factors before insertion.
- No user account or personally identifying information is stored.
*/

CREATE TABLE IF NOT EXISTS public.carbon_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('travel', 'electricity', 'food', 'waste')),
  label text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  unit text NOT NULL,
  emissions_kg numeric NOT NULL CHECK (emissions_kg >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carbon_activities_created_at_idx ON public.carbon_activities (created_at DESC);

ALTER TABLE public.carbon_activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carbon_activities TO anon, authenticated;

DROP POLICY IF EXISTS "Shared activity timeline can be read" ON public.carbon_activities;
CREATE POLICY "Shared activity timeline can be read" ON public.carbon_activities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Activities can be added" ON public.carbon_activities;
CREATE POLICY "Activities can be added" ON public.carbon_activities FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Activities can be updated" ON public.carbon_activities;
CREATE POLICY "Activities can be updated" ON public.carbon_activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Activities can be removed" ON public.carbon_activities;
CREATE POLICY "Activities can be removed" ON public.carbon_activities FOR DELETE TO anon, authenticated USING (true);