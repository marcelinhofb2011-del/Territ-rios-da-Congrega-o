
export enum TerritoryStatus {
  AVAILABLE = 'disponivel',
  REQUESTED = 'solicitado',
  IN_USE = 'em_uso',
  CLOSED = 'fechado',
}

export interface User {
  id: string; // Document ID (mesmo que uid)
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
  createdAt: Date;
}

export interface TerritoryHistory {
  userId: string;
  userName: string;
  completedDate: Date;
  notes?: string;
}

export interface Territory {
  id: string;
  name:string;
  status: TerritoryStatus;
  pdfUrl: string;
  createdAt: Date;
  assignedTo?: string | null;
  assignedToName?: string | null;
  assignmentDate?: Date | null;
  dueDate?: Date | null;
  history: TerritoryHistory[];
  permanentNotes?: string;
}

export enum RequestStatus {
    PENDING = 'pendente',
    APPROVED = 'aprovado',
    REJECTED = 'rejeitado'
}

export interface TerritoryRequest {
    id: string;
    userId: string;
    userName: string;
    requestDate: Date;
    status: RequestStatus;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: Date;
}
