export type User = {
  id?: string;
  name?: string;
  email?: string;
  roles?: string[];
};

declare const user: User | null;
export default user;
