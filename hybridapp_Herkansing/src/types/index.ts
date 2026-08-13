export interface Concert {
  id?: number;
  artist: string;
  date: string;
  time: string;
  venue: string;
  price: number | string;
  created_at?: string;
}

export interface Bezoeker {
  id?: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  email: string;
  created_at?: string;
}

export interface Ticket {
  id?: number;
  concert_id: number;
  visitor_id: number;
  tickets_count: number;
  purchase_date?: string;
  artist?: string;
  date?: string;
  time?: string;
  venue?: string;
  price?: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface NieuwTicket {
  concert_id: number;
  visitor_id: number;
  tickets_count: number;
}

export interface ApiResultaat {
  message: string;
  id?: number | string;
  success?: boolean;
}
