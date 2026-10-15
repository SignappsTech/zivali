-- task: TASK-16.3
-- rollback: drop index app.pets_chip_number_idx; delete from app.app_config where key = 'pets.free_limit';
-- Pets API (C4): an index for the duplicate-chip check on every chip write, and the free limit of active pets.
CREATE INDEX "pets_chip_number_idx" ON "pets"("chip_number");

insert into app.app_config (key, value, is_public, description, updated_at) values
    ('pets.free_limit', '2', true, 'Active (not archived) pet profiles a free account may keep (C4, FR-002)', now())
on conflict (key) do nothing;
