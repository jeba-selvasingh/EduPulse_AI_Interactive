export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  institutionId: string;
  roles: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
};

export type AuthSession = TokenPair & {
  user: AuthUser;
};
