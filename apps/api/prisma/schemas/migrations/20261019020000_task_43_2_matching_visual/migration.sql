-- task: TASK-43.2
-- rollback: delete from app.app_config where key in ('matching.weights_visual', 'matching.visual_floor', 'matching.visual_ceiling');
-- Matching v3 defaults (C8 §Config keys, §Visual similarity): weights with the visual term, and the cosine floor and
-- ceiling that normalise a photo pair's similarity to V. Placeholders until the evaluation (TASK-43.3); values an admin
-- already set stay.
insert into app.app_config (key, value, description) values
    ('matching.weights_visual', '{"distance":0.3,"time":0.15,"attributes":0.25,"visual":0.3}', 'Match score weights when both reports have photo vectors (C8 v3)'),
    ('matching.visual_floor', '0.70', 'Photo cosine similarity that counts as V = 0 for the current embedding model (C8 v3)'),
    ('matching.visual_ceiling', '0.95', 'Photo cosine similarity that counts as V = 1 for the current embedding model (C8 v3)')
on conflict do nothing;
