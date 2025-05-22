import { AuthConfig, PRConfig } from "../../config";
import { makePaginatedRequest, makeRequest } from "../api";

// This is a handwritten partial type, because BB's API spec is a joke.
type BitbucketPRComment = {
  type: "pullrequest_comment";
  id: number;
  created_on: string;
  updated_on: string;
  content: {
    html: string;
    markup: "markdown" | "creole" | "plaintext";
    raw: string;
  };
  user: unknown;
  parent: unknown;
  deleted: boolean;
  pending: boolean;
  links: {
    self: {
      href: string;
    };
    html: {
      href: string;
    };
  };
};

export async function getExistingComment(auth: AuthConfig, pr: PRConfig, identifierText: string) {
  for await (const comment of makePaginatedRequest<BitbucketPRComment>(
    auth,
    `/repositories/${pr.workspace}/${pr.repository}/pullrequests/${pr.id}/comments`,
  )) {
    if (!comment.deleted && comment.content?.raw?.includes(identifierText)) {
      return comment.id;
    }
  }
}

export async function createComment(auth: AuthConfig, pr: PRConfig, content: string) {
  await makeRequest<unknown>(auth, `/repositories/${pr.workspace}/${pr.repository}/pullrequests/${pr.id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: { raw: content } }),
  });
}

export async function updateComment(auth: AuthConfig, pr: PRConfig, id: number, content: string) {
  await makeRequest<unknown>(
    auth,
    `/repositories/${pr.workspace}/${pr.repository}/pullrequests/${pr.id}/comments/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({ content: { raw: content } }),
    },
  );
}
