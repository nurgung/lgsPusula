-- Ornitorenk and kapibara join the existing character list.
-- Existing rows stay valid; only the allowed species set grows.

alter table public.mascot_profiles
  drop constraint mascot_profiles_species;

alter table public.mascot_profiles
  add constraint mascot_profiles_species check (
    species in (
      'cat',
      'turtle',
      'sparrow',
      'platypus',
      'capybara',
      'daisy',
      'sapling'
    )
  );
