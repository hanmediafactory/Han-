// Import/export tools use their explicitly privileged maintenance connections.
// The HTTP runtime must use a separate restricted account.
export function assertSharedRuntimePrivileges(db) {
  const role = db.prepare(`SELECT r.rolsuper AS superuser, r.rolbypassrls AS bypass_rls,
    pg_has_role(current_user, 'han_workspace_server', 'MEMBER') AS server_member,
    has_schema_privilege(current_user, 'han_workspace', 'CREATE') AS schema_create,
    EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='han_workspace' AND c.relkind IN ('r','v','p')
      AND pg_has_role(current_user,c.relowner,'USAGE')) AS owns_objects,
    has_table_privilege(current_user,'han_workspace.admin_links','UPDATE') AS can_change_links,
    has_table_privilege(current_user,'han_workspace.admin_audit','DELETE') AS can_delete_audit
    FROM pg_roles r WHERE r.rolname=current_user`).get();
  if (!role || !role.server_member || role.superuser || role.bypass_rls || role.schema_create || role.owns_objects || role.can_change_links || role.can_delete_audit) {
    throw new Error('Shared HTTP runtime requires a restricted han_workspace_server member; migration owners, elevated roles and identity/audit administration are prohibited.');
  }
}
