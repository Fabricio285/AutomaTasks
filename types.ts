
export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
}

export type TaskStatus = 'pending' | 'accepted' | 'completed';

export interface TaskNote {
  id: string;
  text: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: TaskStatus;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  estimatedHours: number;
  notes: TaskNote[];
}

export interface BusinessDayConfig {
  active: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface BusinessHours {
  [key: number]: BusinessDayConfig; // 0 (Sun) to 6 (Sat)
}

export interface AppState {
  users: User[];
  tasks: Task[];
  businessHours: BusinessHours;
  currentUser: User | null;
}
