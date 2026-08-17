-- Supabase revokes default EXECUTE privileges on new functions in the public
-- schema from PUBLIC, so my_role()/my_customer_id() (used by nearly every RLS
-- policy in 0001_init.sql) fail with "permission denied for function my_role"
-- for both anon and authenticated until explicitly granted.
grant execute on function my_role() to anon, authenticated;
grant execute on function my_customer_id() to anon, authenticated;
