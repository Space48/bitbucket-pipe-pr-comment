import { AuthConfig, getAuthConfig } from "./auth";
import { CommentConfig, getCommentConfig } from "./comment";
import { getPRConfig, PRConfig } from "./pr";

export type { AuthConfig } from "./auth";
export type { CommentConfig } from "./comment";
export type { PRConfig } from "./pr";

export type Config = Readonly<{
  auth: AuthConfig;
  pr: PRConfig;
  comment: CommentConfig;
}>;

export function getConfig(): Config {
  return {
    auth: getAuthConfig(),
    pr: getPRConfig(),
    comment: getCommentConfig(),
  };
}
