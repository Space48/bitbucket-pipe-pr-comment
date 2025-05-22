import { getFileValue, getOptionalValue } from "./utils";

export type CommentConfig = Readonly<{
  content: string;
  identifier?: string;
}>;

export function getCommentConfig(): CommentConfig {
  const contentText = getOptionalValue("CONTENT_TEXT");
  const contentFile = getOptionalValue("CONTENT_FILE");

  const content = contentText ?? (contentFile ? getFileValue(contentFile) : undefined);

  // Deliberately checking against undefined here to allow for empty content
  if (content == undefined)
    throw new Error("Comment content not provided: you must provide either CONTENT_TEXT or CONTENT_FILE.");

  return {
    content,
    identifier: getOptionalValue("COMMENT_IDENTIFIER"),
  };
}
