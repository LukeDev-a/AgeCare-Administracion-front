import { apiFetch } from './client';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketRequester {
  name: string;
  email: string;
  role: string;
}

export interface TicketListItem {
  id: string;
  number: number;
  subject: string;
  requester: TicketRequester;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
}

export interface TicketsListResponse {
  items: TicketListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TicketAssignee {
  admin_id: string;
  full_name?: string;
}

export interface TicketDetailData {
  id: string;
  number: number;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requester: TicketRequester;
  assigned_to?: TicketAssignee | null;
  replies_count: number;
  created_at: string;
}

export interface TicketReply {
  author_name: string;
  created_at: string;
  internal: boolean;
  body: string;
}

export interface Agent {
  id: string;
  full_name: string;
}

export interface TicketListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface NewTicketPayload {
  subject: string;
  user_email: string;
  category: string;
  priority: TicketPriority;
  description: string;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchTickets(params: TicketListParams): Promise<TicketsListResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
    order: '-created_at',
  });
  if (params.search) query.set('q', params.search);
  if (params.status) query.set('status', params.status);
  const response = await apiFetch(`/support/tickets?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar los tickets.');
  return response.json();
}

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetailData> {
  const response = await apiFetch(`/support/tickets/${ticketId}`);
  if (!response.ok) throw new Error('No fue posible cargar el detalle.');
  return response.json();
}

export async function fetchTicketReplies(ticketId: string): Promise<TicketReply[]> {
  const response = await apiFetch(`/support/tickets/${ticketId}/replies?page=1&page_size=100`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.items ?? [];
}

export async function fetchAgents(): Promise<Agent[]> {
  const response = await apiFetch('/users?is_active=true&page=1&page_size=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.items ?? [];
}

export async function updateTicket(ticketId: string, status: TicketStatus, assignedTo: string | null): Promise<void> {
  const response = await apiFetch(`/support/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, assigned_to: assignedTo }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible actualizar el ticket.'));
}

export async function createReply(ticketId: string, body: string, internal: boolean): Promise<void> {
  const response = await apiFetch(`/support/tickets/${ticketId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ body, internal }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible enviar la respuesta.'));
}

export async function createTicket(payload: NewTicketPayload): Promise<void> {
  const response = await apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ ...payload, channel: 'console', confirm_unlinked: true }),
  });
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'No fue posible crear el ticket.'));
}