export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  textColor: string;
}

export interface Comment {
  id:string;
  userId: string;
  page: number;
  x: number;
  y: number;
  text: string;
  replies: Comment[];
  timestamp: string;
}

export interface NewComment {
  text: string;
  page: number;
  x: number;
  y: number;
}
