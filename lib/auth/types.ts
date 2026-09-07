export type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  mustChangePassword: boolean;
};

export type AuthResult = { user: AuthUser };
