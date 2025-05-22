import { CommentConfig } from "./config";

export function getCommentContent(config: CommentConfig) {
  const identifierLine = config.identifier ? "\n" + getFormattedIdentifier(config.identifier) : "";

  const rawContent = `${config.content}${identifierLine}`;

  return rawContent;
}

export function getFormattedIdentifier(identifier: string) {
  /**
   * Formatting the identifier as a reference-style link definition in Markdown
   * so it is not rendered in the comment output.
   */
  return `\n[comment]: # (bitbucket-pipe-pr-comment: ${identifier})`;
}
