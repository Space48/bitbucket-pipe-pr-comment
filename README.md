# Bitbucket Pipe: PR Comment

A Bitbucket Pipe to add or update a comment on a Bitbucket pull request from your CI pipeline.

---

## Usage

Add the following step to your `bitbucket-pipelines.yml`:

```yaml
- pipe: space48/bitbucket-pipe-pr-comment:latest
  variables:
    BITBUCKET_USERNAME: $BITBUCKET_USERNAME
    BITBUCKET_APP_PASSWORD: $BITBUCKET_APP_PASSWORD
    CONTENT_TEXT: "Your comment here"
    COMMENT_IDENTIFIER: "unique-identifier" # optional
```

## Variables

| Variable               | Required | Description                                                                                                                                                |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BITBUCKET_USERNAME     | Yes      | Bitbucket username for authentication                                                                                                                      |
| BITBUCKET_APP_PASSWORD | Yes      | Bitbucket app password for authentication                                                                                                                  |
| BITBUCKET_PR_ID        | Yes      | Pull request ID to comment on. Provided by Bitbucket when the pipeline is triggered from a PR.                                                             |
| BITBUCKET_WORKSPACE    | Yes      | Bitbucket workspace (team or user). Provided by Bitbucket.                                                                                                 |
| BITBUCKET_REPO_SLUG    | Yes      | Repository slug. Provided by Bitbucket.                                                                                                                    |
| CONTENT_TEXT           | Yes\*    | The comment text to add or update                                                                                                                          |
| CONTENT_FILE           | Yes\*    | Path to a file containing the comment text (alternative to above)                                                                                          |
| COMMENT_IDENTIFIER     | No       | Unique identifier to identify the comment. If provided, repeated invocations will update the existing comment. Otherwise, a new comment is always created. |

_\*You must provide either `CONTENT_TEXT` or `CONTENT_FILE`._

## Examples

### Basic example

Post a comment at the end of a pipeline.

```yaml
- pipe: space48/bitbucket-pipe-pr-comment:latest
  variables:
    BITBUCKET_USERNAME: $BITBUCKET_USERNAME
    BITBUCKET_APP_PASSWORD: $BITBUCKET_APP_PASSWORD
    CONTENT_TEXT: "Automated test results: All tests passed!"
```

### Advanced example

Keep a deployment changelog comment up to date with results from the latest build.

```yaml
- pipe: space48/bitbucket-pipe-pr-comment:latest
  variables:
    BITBUCKET_USERNAME: $BITBUCKET_USERNAME
    BITBUCKET_APP_PASSWORD: $BITBUCKET_APP_PASSWORD
    CONTENT_FILE: "deployment.log"
    COMMENT_IDENTIFIER: deployment-changelog
```

## License

MIT licensed, see [LICENSE.txt](LICENSE.txt) for more details.

---

For more information, see the [pipe.yml](./pipe.yml) metadata file and the [Bitbucket Pipes documentation](https://support.atlassian.com/bitbucket-cloud/docs/create-a-pipe/).
