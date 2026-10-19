-- task: TASK-42.3
-- rollback: delete from app.ai_calls where provider = 'mock'; alter table app.ai_calls drop constraint ai_calls_provider_check, add constraint ai_calls_provider_check check (provider in ('anthropic', 'voyage'));
-- The mock embedder's calls are recorded as provider mock, so local mock spend never counts toward the Voyage budget
-- (C20 §Jobs, TASK-42.1 review).

alter table app.ai_calls drop constraint ai_calls_provider_check,
    add constraint ai_calls_provider_check check (provider in ('anthropic', 'voyage', 'mock'));
