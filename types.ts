

export enum TerritoryStatus {
  AVAILABLE = 'disponivel',
  REQUESTED = 'solicitado',
  IN_USE = 'em_uso',
  CLOSED = 'fechado',
}

export interface User {
  id: string; // This will be the UID from Firebase Auth
  email: string;
  name: string;
  role: 'admin' | 'publicador';
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

export interface Report {
    id: string;
    territoryId: string;
    territoryName: string;
    userId: string;
    userName: string;
    reportDate: Date;
    notes: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: Date;
}