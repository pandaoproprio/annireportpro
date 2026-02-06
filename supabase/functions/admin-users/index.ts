import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  sendInvite?: boolean;
}

interface UpdateUserRequest {
  userId: string;
  name?: string;
  role?: 'user' | 'admin' | 'super_admin';
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
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create client with user's token to verify permissions
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

    // Get calling user
    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if calling user is super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Super Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET: List all users
    if (req.method === 'GET') {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      // Get profiles and roles
      const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
      const { data: roles } = await supabaseAdmin.from('user_roles').select('*');

      const enrichedUsers = users.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id);
        const role = roles?.find(r => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          name: profile?.name || user.email?.split('@')[0],
          role: role?.role || 'user',
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
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let userData;

      if (sendInvite) {
        // Send invite email
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { name },
          redirectTo: `${url.origin.replace('functions/v1', '')}`
        });
        if (error) throw error;
        userData = data.user;
      } else {
        // Create user with password
        if (!password || password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name }
        });
        if (error) throw error;
        userData = data.user;
      }

      if (userData) {
        // Update role (the trigger creates default 'user' role)
        await supabaseAdmin
          .from('user_roles')
          .update({ role })
          .eq('user_id', userData.id);
      }

      return new Response(JSON.stringify({ success: true, user: userData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PATCH: Update user
    if (req.method === 'PATCH') {
      const body: UpdateUserRequest = await req.json();
      const { userId, name, role } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent self-demotion
      if (userId === callingUser.id && role && role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'Cannot change your own role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (name) {
        await supabaseAdmin.from('profiles').update({ name }).eq('user_id', userId);
      }

      if (role) {
        await supabaseAdmin.from('user_roles').update({ role }).eq('user_id', userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE: Delete user
    if (req.method === 'DELETE') {
      const body: DeleteUserRequest = await req.json();
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent self-deletion
      if (userId === callingUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin users error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
