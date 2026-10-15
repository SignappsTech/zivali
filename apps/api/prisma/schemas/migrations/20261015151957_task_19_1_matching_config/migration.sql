-- task: TASK-19.1
-- rollback: delete from app.app_config where key like 'matching.%';
-- Matching engine v1 defaults (C8 §Config keys), read through lib/config-store.ts; values an admin already set stay.
insert into app.app_config (key, value, description) values
    ('matching.threshold', '0.5', 'Lowest score stored as a match suggestion (C8)'),
    ('matching.top_n', '10', 'Most match suggestions per lost report (C8)'),
    ('matching.max_days', '30', 'Days after the loss in which a found or sighted report still matches (C8)'),
    ('matching.max_distance_km', '30', 'Largest distance between a lost report and a candidate, km (C8)'),
    ('matching.distance_scale_km', '3', 'Distance decay scale of the match score, km (C8)'),
    ('matching.weights', '{"distance":0.4,"time":0.2,"attributes":0.4}', 'Match score weights (C8)'),
    ('matching.notify_min_strength', '"good"', 'Weakest suggestion that notifies the lost report''s managers (C8)')
on conflict do nothing;
