-- task: TASK-26.7
-- rollback: delete from app.app_config where key = 'retention.exact_point_blur_days';
-- retention.blur_location (ADR-006, CH-24): days after a report closes or is reunited before its stored point is
-- replaced by the public centre of its circle.

insert into app.app_config (key, value, description) values
    ('retention.exact_point_blur_days', '30', 'Days after a report closes or is reunited before its stored point is replaced by the public centre of its circle (ADR-006, retention.blur_location)')
on conflict do nothing;
