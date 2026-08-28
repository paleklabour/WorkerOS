create policy line_groups_delete on public.line_groups
  for delete
  using (my_role() = 'admin');
