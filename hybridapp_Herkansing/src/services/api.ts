import type { Concert, Bezoeker, Ticket, NieuwTicket, ApiResultaat } from '../types';

const API_BASE_URL = 'https://danicktchang.be/API/endpoints';

async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.text();
      console.error('API Error Response:', errorData);
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        if (errorData) {
          errorMessage = errorData;
        }
      }
    } catch {
      console.error('Fout bij lezen error response');
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Fout bij parsen JSON:', text);
    throw new Error('Ongeldig antwoord van de server');
  }
}

export async function getConcerten(): Promise<Concert[]> {
  return apiRequest<Concert[]>('/concerts.php', 'GET');
}

export async function getConcertById(id: number): Promise<Concert> {
  return apiRequest<Concert>(`/concerts.php?id=${id}`, 'GET');
}

export async function createConcert(concert: Concert): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>('/concerts.php', 'POST', concert);
}

export async function updateConcert(id: number, concert: Concert): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>(`/concerts.php?id=${id}`, 'PUT', concert);
}

export async function deleteConcert(id: number): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>(`/concerts.php?id=${id}`, 'DELETE');
}

export async function getBezoekers(): Promise<Bezoeker[]> {
  return apiRequest<Bezoeker[]>('/visitors.php', 'GET');
}

export async function getBezoekerById(id: number): Promise<Bezoeker> {
  return apiRequest<Bezoeker>(`/visitors.php?id=${id}`, 'GET');
}

export async function createBezoeker(bezoeker: Bezoeker): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>('/visitors.php', 'POST', bezoeker);
}

export async function updateBezoeker(id: number, bezoeker: Bezoeker): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>(`/visitors.php?id=${id}`, 'PUT', bezoeker);
}

export async function deleteBezoeker(id: number): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>(`/visitors.php?id=${id}`, 'DELETE');
}

export async function getTickets(): Promise<Ticket[]> {
  return apiRequest<Ticket[]>('/tickets.php', 'GET');
}

export async function koopTicket(ticket: NieuwTicket): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>('/tickets.php', 'POST', ticket);
}

export async function deleteTicket(id: number): Promise<ApiResultaat> {
  return apiRequest<ApiResultaat>(`/tickets.php?id=${id}`, 'DELETE');
}
