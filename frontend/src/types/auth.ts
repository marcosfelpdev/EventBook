export type Role = 'ADMIN' | 'ORGANIZER' | 'STAFF' | 'BUYER';

export const ROLES: Record<Role, Role> = {
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  STAFF: 'STAFF',
  BUYER: 'BUYER',
};

export interface User {
  id: string;
  name?: string;
  email: string;
  role: Role;
}