import { createComment, getExistingComment, updateComment } from "./bitbucket/pullrequests/comments";
import { getCommentContent, getFormattedIdentifier } from "./comment";
import { getConfig } from "./config";

async function main() {
  const config = getConfig();
  const identifier = config.comment.identifier ? getFormattedIdentifier(config.comment.identifier) : undefined;
  const commentId = identifier ? await getExistingComment(config.auth, config.pr, identifier) : undefined;
  const content = getCommentContent(config.comment);

  if (commentId) {
    await updateComment(config.auth, config.pr, commentId, content);
  } else {
    await createComment(config.auth, config.pr, content);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error : JSON.stringify(error));
  process.exit(1);
});
