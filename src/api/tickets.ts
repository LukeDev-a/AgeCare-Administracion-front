import { apiFetch } from './client';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketRequester {
  name: string;
  email: string;
  role: string | null;
  user_id?: string | null;
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
  assigned_to?: TicketAssignee | null;
}

export interface TicketsListResponse {
  items: TicketListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TicketAssignee {
  admin_id: string;
  name: string;
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
  updated_at: string;
  first_response_at: string | null;
  channel: string;
  requester_context: Record<string, unknown> | null;
  csat: { score: number; comment: string | null } | null;
}

export interface TicketReply {
  id: string;
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
  priority?: string;
  category?: string;
  role?: string;
  assignedTo?: string;
  order?: string;
}

export interface NewTicketPayload {
  subject: string;
  user_email: string;
  category: string;
  priority: TicketPriority;
  description: string;
  channel?: string;
  confirm_unlinked?: boolean;
}

export interface TicketPatch {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assigned_to?: string | null;
}

export class TicketApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

async function ticketError(response: Response, fallback: string): Promise<TicketApiError> {
  try {
    const data = await response.json();
    return new TicketApiError(data?.error?.message ?? fallback, data?.error?.code);
  } catch { return new TicketApiError(fallback); }
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
    order: params.order ?? '-created_at',
  });
  if (params.search) query.set('q', params.search);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.category) query.set('category', params.category);
  if (params.role) query.set('role', params.role);
  if (params.assignedTo) query.set('assigned_to', params.assignedTo);
  const response = await apiFetch(`/support/tickets?${query}`);
  if (!response.ok) throw new Error('No fue posible cargar los tickets.');
  return response.json();
}

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetailData> {
  const response = await apiFetch(`/support/tickets/${encodeURIComponent(ticketId)}`);
  if (!response.ok) throw new Error('No fue posible cargar el detalle.');
  return response.json();
}

export interface TicketRepliesPage {
  items: TicketReply[];
  total: number;
  page: number;
  page_size: number;
}

export async function fetchTicketReplies(ticketId: string, page = 1): Promise<TicketRepliesPage> {
  const response = await apiFetch(`/support/tickets/${encodeURIComponent(ticketId)}/replies?page=${page}&page_size=25`);
  if (!response.ok) throw await ticketError(response, 'No fue posible cargar la conversación.');
  return response.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  const response = await apiFetch('/support/agents');
  if (!response.ok) throw new Error('No fue posible cargar los responsables disponibles.');
  return response.json();
}

export async function updateTicket(ticketId: string, patch: TicketPatch): Promise<void> {
  const response = await apiFetch(`/support/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
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
    body: JSON.stringify({ ...payload, channel: payload.channel ?? 'console', confirm_unlinked: payload.confirm_unlinked ?? false }),
  });
  if (!response.ok) throw await ticketError(response, 'No fue posible crear el ticket.');
}
