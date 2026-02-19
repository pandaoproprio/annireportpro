import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

type AppRole = 'usuario' | 'analista' | 'admin' | 'super_admin';

interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  role: AppRole;
  sendInvite?: boolean;
}

interface UpdateUserRequest {
  userId: string;
  name?: string;
  role?: AppRole;
  password?: string;
  permissions?: string[];
}

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    const callerRole = roleData?.role;

    // Only super_admin and admin can access this endpoint
    if (roleError || !roleData || (callerRole !== 'super_admin' && callerRole !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ===== PERMISSIONS MANAGEMENT =====
    if (action === 'permissions') {
      // Only super_admin can manage permissions
      if (callerRole !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Super Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (req.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { data, error } = await supabaseAdmin
          .from('user_permissions')
          .select('permission')
          .eq('user_id', userId);
        if (error) throw error;
        return new Response(JSON.stringify({ permissions: (data || []).map(d => d.permission) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (req.method === 'PATCH') {
        const { userId, permissions } = await req.json();
        if (!userId || !permissions) {
          return new Response(JSON.stringify({ error: 'userId and permissions are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        // Delete existing and re-insert
        await supabaseAdmin.from('user_permissions').delete().eq('user_id', userId);
        if (permissions.length > 0) {
          const rows = permissions.map((p: string) => ({
            user_id: userId,
            permission: p,
            granted_by: callingUser.id
          }));
          const { error } = await supabaseAdmin.from('user_permissions').insert(rows);
          if (error) throw error;
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ===== COLLABORATORS MANAGEMENT =====
    if (action === 'collaborators') {
      // Only super_admin can manage collaborators
      if (callerRole !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Super Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (req.method === 'GET') {
        const userId = url.searchParams.get('userId');
        
        if (userId) {
          const { data, error } = await supabaseAdmin
            .from('project_collaborators')
            .select('id, project_id, created_at')
            .eq('user_id', userId);
          if (error) throw error;
          return new Response(JSON.stringify({ collaborators: data || [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data: projects, error } = await supabaseAdmin
          .from('projects')
          .select('id, name, organization_name');
        if (error) throw error;
        return new Response(JSON.stringify({ projects: projects || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (req.method === 'POST') {
        const { userId, projectId } = await req.json();
        if (!userId || !projectId) {
          return new Response(JSON.stringify({ error: 'userId and projectId are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabaseAdmin
          .from('project_collaborators')
          .insert({ user_id: userId, project_id: projectId, added_by: callingUser.id });
        
        if (error) {
          if (error.code === '23505') {
            return new Response(JSON.stringify({ error: 'Usuário já é colaborador deste projeto' }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (req.method === 'DELETE') {
        const { userId, projectId } = await req.json();
        if (!userId || !projectId) {
          return new Response(JSON.stringify({ error: 'userId and projectId are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabaseAdmin
          .from('project_collaborators')
          .delete()
          .eq('user_id', userId)
          .eq('project_id', projectId);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ===== USER MANAGEMENT =====

    // GET: List all users
    if (req.method === 'GET') {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
      const { data: roles } = await supabaseAdmin.from('user_roles').select('*');
      const { data: allPermissions } = await supabaseAdmin.from('user_permissions').select('*');

      const enrichedUsers = users.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id);
        const role = roles?.find(r => r.user_id === user.id);
        const userPerms = allPermissions?.filter(p => p.user_id === user.id).map(p => p.permission) || [];
        return {
          id: user.id,
          email: user.email,
          name: profile?.name || user.email?.split('@')[0],
          role: role?.role || 'usuario',
          permissions: userPerms,
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at,
          emailConfirmed: user.email_confirmed_at !== null
        };
      });

      return new Response(JSON.stringify({ users: enrichedUsers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST: Create user
    if (req.method === 'POST') {
      const body: CreateUserRequest = await req.json();
      const { email, password, name, role, sendInvite } = body;

      if (!email || !name || !role) {
        return new Response(JSON.stringify({ error: 'Email, name and role are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Admin can only create usuario/analista; super_admin can create any
      if (callerRole === 'admin' && (role === 'super_admin' || role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin não pode criar usuários com papel Admin ou Super Admin' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let userData;

      if (sendInvite) {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { name },
          redirectTo: `${url.origin.replace('functions/v1', '')}`
        });
        if (error) {
          if (error.message?.includes('already been registered')) {
            return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado no sistema' }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw error;
        }
        userData = data.user;
      } else {
        if (!password || password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { name }
        });
        if (error) {
          if (error.message?.includes('already been registered')) {
            return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado no sistema' }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw error;
        }
        userData = data.user;
      }

      if (userData) {
        // Update role from default 'usuario' to requested role
        await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', userData.id);
        // Populate permissions for the role
        await supabaseAdmin.rpc('populate_default_permissions', { _user_id: userData.id, _role: role });
        // Ensure must_change_password is true for new users (default)
        await supabaseAdmin.from('profiles').update({ must_change_password: true }).eq('user_id', userData.id);
        // Log user creation
        await supabaseAdmin.from('system_logs').insert([{
          user_id: callingUser.id,
          action: 'user_created',
          entity_type: 'user',
          entity_id: userData.id,
          new_data: { email, name, role },
          ip_address: req.headers.get('x-forwarded-for') || null,
          user_agent: req.headers.get('user-agent') || null,
        }]);
      }

      return new Response(JSON.stringify({ success: true, user: userData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PATCH: Update user
    if (req.method === 'PATCH') {
      const body: UpdateUserRequest = await req.json();
      const { userId, name, role, password, permissions } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Admin restrictions
      if (callerRole === 'admin') {
        if (role === 'super_admin' || role === 'admin') {
          return new Response(JSON.stringify({ error: 'Admin não pode definir papel Admin ou Super Admin' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (permissions) {
          return new Response(JSON.stringify({ error: 'Admin não pode alterar permissões' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (userId === callingUser.id && role && role !== callerRole) {
        return new Response(JSON.stringify({ error: 'Cannot change your own role' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (name) {
        await supabaseAdmin.from('profiles').update({ name }).eq('user_id', userId);
      }

      if (role) {
        // Get old role for logging
        const { data: oldRoleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).single();
        await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', userId);
        await supabaseAdmin.rpc('populate_default_permissions', { _user_id: userId, _role: role });
        // Log role change
        await supabaseAdmin.from('system_logs').insert([{
          user_id: callingUser.id,
          action: 'user_role_changed',
          entity_type: 'user',
          entity_id: userId,
          old_data: { role: oldRoleData?.role },
          new_data: { role },
          ip_address: req.headers.get('x-forwarded-for') || null,
          user_agent: req.headers.get('user-agent') || null,
        }]);
      }

      // Custom permissions override (only super_admin)
      if (permissions && callerRole === 'super_admin') {
        await supabaseAdmin.from('user_permissions').delete().eq('user_id', userId);
        if (permissions.length > 0) {
          const rows = permissions.map((p: string) => ({
            user_id: userId,
            permission: p,
            granted_by: callingUser.id
          }));
          await supabaseAdmin.from('user_permissions').insert(rows);
        }
      }

      if (password) {
        if (password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (pwError) throw pwError;
        // Reset password policy flags when admin resets password
        await supabaseAdmin.from('profiles').update({
          must_change_password: true,
          login_attempts_without_change: 0,
          first_login_at: null,
        }).eq('user_id', userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE: Delete user
    if (req.method === 'DELETE') {
      // Only super_admin can delete users
      if (callerRole !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Forbidden: Super Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body: DeleteUserRequest = await req.json();
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (userId === callingUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin users error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
