-- TASK-35.2: the click redirect target must be https with no whitespace or control characters.
alter table app.ads drop constraint ads_link_url_check;
alter table app.ads add constraint ads_link_url_check check (link_url ~ '^https://[^[:space:][:cntrl:]]+$');
