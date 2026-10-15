-- task: TASK-35.1
-- rollback: delete from app.app_config where key = 'ads.blocked_terms';
-- C14 content rule: keywords (SL and EN) that stop an ad on save and on serving, on top of the category blocklist in
-- domains/ads/ads.domain.ts (selling, giving away, rehoming). Whole words or phrases, case and diacritics ignored.
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('ads.blocked_terms', '["prodaja mladičev", "mladiči naprodaj", "mladička naprodaj", "mucke oddam", "kupim psa", "kupim mačko", "rezervacija mladiča", "vzreditelj", "vzreditelji", "puppies for sale", "puppy for sale", "kittens for sale", "kitten for sale", "buy a puppy", "buy a kitten", "adoption fee", "rehoming fee", "breeder", "breeders"]', false, 'Ad keywords refused on save and never served (C14 content rule), SL and EN', now())
on conflict (key) do nothing;
