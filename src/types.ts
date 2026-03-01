export interface User {
  id: number;
  email: string;
  name: string;
  plan: 'free' | 'premium';
  streak: number;
  progress: number;
  last_access: string;
}

export interface Day {
  id: number;
  title: string;
  verse: string;
  reflection: string;
  application: string;
  exercise: string;
  declaration: string;
}

export interface Prayer {
  id: number;
  category: string;
  title: string;
  content: string;
  declaration: string;
}

export interface Checklist {
  user_id: number;
  date: string;
  morning_status: string[];
  night_status: string[];
}
