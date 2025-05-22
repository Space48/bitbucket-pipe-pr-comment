import { getRequiredValue } from "./utils";

export type PRConfig = Readonly<{
  id: number;
  workspace: string;
  repository: string;
}>;

export function getPRConfig(): PRConfig {
  return {
    id: Number(
      getRequiredValue(
        "BITBUCKET_PR_ID",
        "Missing required configuration variable BITBUCKET_PR_ID: This pipe can only be used in a pull request pipeline.",
      ),
    ),
    workspace: getRequiredValue("BITBUCKET_WORKSPACE"),
    repository: getRequiredValue("BITBUCKET_REPO_SLUG"),
  };
}
