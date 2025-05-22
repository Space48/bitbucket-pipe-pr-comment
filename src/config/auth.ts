import { getRequiredValue } from "./utils";

export type AuthConfig = Readonly<{
  username: string;
  password: string;
}>;

export function getAuthConfig(): AuthConfig {
  return {
    username: getRequiredValue("BITBUCKET_USERNAME"),
    password: getRequiredValue("BITBUCKET_APP_PASSWORD"),
  };
}
