export enum TerritoryStatus {
  AVAILABLE = 'disponivel',
  REQUESTED = 'solicitado',
  IN_USE = 'em_uso',
  CLOSED = 'fechado',
  RESTING = 'descanso',
}

export enum RequestStatus {
  PENDING = 'pendente',
  APPROVED = 'aprovado',
  REJECTED = 'rejeitado',
}

export interface User {
  id: string;
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
  assignmentDate: Date;
  completedDate: Date;
  notes?: string;
}

export interface Territory {
  id: string;
  name: string;
  number: string;
  locality: string;
  description: string;
  observation: string;
  status: TerritoryStatus;
  pdfUrl: string;
  createdAt: Date;
  assignedTo: string | null;
  assignedToName: string | null;
  assignmentDate: Date | null;
  dueDate: Date | null;
  lastCompletedDate: Date | null;
  assignmentOrder?: number;
  history: TerritoryHistory[];
  permanentNotes?: string;
  workedOn?: boolean;
  returnedAt?: Date | null;
  availableAt?: Date | null;
}

export interface TerritoryRequest {
  id: string;
  userId: string;
  userName: string;
  requestDate: Date;
  status: RequestStatus;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: Date;
}