-- NUMI owner bootstrap: promote the configured Supabase owner account.
-- Idempotent and scoped by both stable Supabase openId and email.
update public.users
set role = 'admin'
where "openId" = 'supabase:e9c8ac55-3762-41f2-b5d9-c41e1d5714c3'
  and email = 'tayebkedadouche09@gmail.com';
