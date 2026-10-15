-- task: TASK-21.2
-- rollback: drop policy if exists "members receive" on realtime.messages; drop function app.can_join_topic(uuid, text);
--   delete from app.app_config where key = 'retention.chat_months';
-- Chat Realtime authorisation (C9, ADR-023): Broadcast on private channels; a client receives `user:<own id>` and
-- `conversation:<id>` of the conversations it takes part in. There is no insert policy, so clients cannot broadcast:
-- only the API sends (realtime.send). anon and authenticated still get no usage on schema app (ADR-021): the policy
-- stores the function by oid, so evaluating it needs only EXECUTE.

create function app.can_join_topic(uid uuid, topic text) returns boolean
	language sql stable security definer set search_path = ''
as $$
	select case
		when topic like 'user:%' then topic = 'user:' || uid::text
		when topic like 'conversation:%' then exists (
			select 1 from app.conversation_participants p
			where p.user_id = uid and p.conversation_id::text = substr(topic, 14)
		)
		else false
	end
$$;
revoke all on function app.can_join_topic(uuid, text) from public;
grant execute on function app.can_join_topic(uuid, text) to authenticated;

-- realtime.messages exists only where Supabase Realtime runs (local stack, staging, production); shadow and bare
-- scratch databases skip the policy.
do $$
begin
	if to_regclass('realtime.messages') is not null then
		create policy "members receive" on realtime.messages for select to authenticated
			using (app.can_join_topic(auth.uid(), realtime.topic()));
	end if;
end
$$;

insert into app.app_config (key, value, is_public, description)
values ('retention.chat_months', '6', false, 'Months after a report closes before its read-only conversations and messages are deleted (C9)')
on conflict (key) do nothing;
