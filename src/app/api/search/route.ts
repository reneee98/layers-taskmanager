import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

/**
 * Removes HTML tags from a string (server-side version)
 */
const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, '')
    .trim();
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's workspace (works for both owners and members)
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "No workspace found" }, { status: 404 });
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const results: any[] = [];

    // Search projects
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        code,
        description,
        client:clients(name)
      `)
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.${searchTerm},code.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    if (projects) {
      projects.forEach(project => {
        results.push({
          id: project.id,
          type: 'project',
          title: stripHtml(project.name),
          subtitle: `${project.code} • ${project.client?.[0]?.name || 'Bez klienta'}`,
          description: stripHtml(project.description),
          url: `/projects/${project.id}`,
          icon: 'FolderKanban',
          badge: 'Projekt'
        });
      });
    }

    // Search tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        project:projects(id, name, code)
      `)
      .eq('workspace_id', workspaceId)
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    if (tasks) {
      tasks.forEach(task => {
        const statusMap = {
          'todo': 'Na spracovanie',
          'in_progress': 'V procese',
          'review': 'Na kontrole',
          'done': 'Hotové',
          'sent_to_client': 'Odoslané klientovi'
        };

        results.push({
          id: task.id,
          type: 'task',
          title: stripHtml(task.title),
          subtitle: `${task.project?.[0]?.name || 'Neznámy projekt'} • ${statusMap[task.status as keyof typeof statusMap] || task.status}`,
          description: stripHtml(task.description),
          url: `/projects/${task.project?.[0]?.id || 'unknown'}/tasks/${task.id}`,
          icon: 'Clock',
          badge: task.priority === 'urgent' ? 'Urgentné' : 'Úloha'
        });
      });
    }

    // Search clients
    const { data: clients } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        company
      `)
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
      .limit(5);

    if (clients) {
      clients.forEach(client => {
        results.push({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.company ? `${client.company} • ${client.email}` : client.email,
          description: client.phone,
          url: `/clients`,
          icon: 'Building2',
          badge: 'Klient'
        });
      });
    }

    // Search invoices (if they exist)
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        status,
        client:clients(name)
      `)
      .eq('workspace_id', workspaceId)
      .or(`invoice_number.ilike.${searchTerm}`)
      .limit(3);

    if (invoices) {
      invoices.forEach(invoice => {
        results.push({
          id: invoice.id,
          type: 'invoice',
          title: `Faktúra ${invoice.invoice_number}`,
          subtitle: `${invoice.client?.[0]?.name || 'Bez klienta'} • ${invoice.total_amount}€`,
          description: `Status: ${invoice.status}`,
          url: `/invoices`,
          icon: 'FileText',
          badge: 'Faktúra'
        });
      });
    }

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      return bExact - aExact;
    });

    return NextResponse.json({ 
      success: true, 
      results: sortedResults.slice(0, 10) // Limit to 10 results
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
