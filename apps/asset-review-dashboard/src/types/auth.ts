export type AuthUser = {
  email: string;
  name: string;
  picture: string | null;
  role: "admin" | "technical" | "pending" | string;
  status: "approved" | "pending" | "rejected" | string;
  technicalMode: boolean;
  canApproveUsers: boolean;
};

export type AuthMeResponse =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: AuthUser;
    };

export type AuthUsersResponse = {
  ok: boolean;
  users: AuthUser[];
};
