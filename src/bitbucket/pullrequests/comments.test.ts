import { AuthConfig, PRConfig } from "../../config";
import { makePaginatedRequest, makeRequest } from "../api";
import { createComment, getExistingComment, updateComment } from "./comments";

// Mock the API functions
jest.mock("../api", () => ({
  makePaginatedRequest: jest.fn(),
  makeRequest: jest.fn(),
}));

const mockMakePaginatedRequest = makePaginatedRequest as jest.MockedFunction<typeof makePaginatedRequest>;
const mockMakeRequest = makeRequest as jest.MockedFunction<typeof makeRequest>;

// Test data types
type MockComment = {
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

describe("Pullrequest Comments", () => {
  const mockAuth: AuthConfig = {
    username: "testuser",
    password: "testpass",
  };

  const mockPR: PRConfig = {
    id: 123,
    workspace: "test-workspace",
    repository: "test-repo",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getExistingComment", () => {
    const createMockComment = (id: number, content: string, deleted = false): MockComment => ({
      type: "pullrequest_comment",
      id,
      created_on: "2023-01-01T10:00:00Z",
      updated_on: "2023-01-01T10:00:00Z",
      content: {
        html: `<p>${content}</p>`,
        markup: "markdown",
        raw: content,
      },
      user: {},
      parent: null,
      deleted,
      pending: false,
      links: {
        self: {
          href: `https://api.bitbucket.org/2.0/repositories/test-workspace/test-repo/pullrequests/123/comments/${id}`,
        },
        html: {
          href: `https://bitbucket.org/test-workspace/test-repo/pull-requests/123#comment-${id}`,
        },
      },
    });

    it("should return comment id when matching identifier is found", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: test-id)";
      const comments = [
        createMockComment(1, "First comment without identifier"),
        createMockComment(2, `Second comment\n${identifierText}`),
        createMockComment(3, "Third comment without identifier"),
      ];

      // Mock the async generator
      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        yield* comments;
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBe(2);
      expect(mockMakePaginatedRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments",
      );
    });

    it("should return undefined when no matching identifier is found", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: missing-id)";
      const comments = [
        createMockComment(1, "First comment without identifier"),
        createMockComment(2, "Second comment without identifier"),
        createMockComment(3, "[comment]: # (bitbucket-pipe-pr-comment: different-id)"),
      ];

      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        yield* comments;
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBeUndefined();
    });

    it("should skip deleted comments", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: test-id)";
      const comments = [
        createMockComment(1, `Deleted comment\n${identifierText}`, true), // deleted
        createMockComment(2, `Active comment\n${identifierText}`, false), // not deleted
      ];

      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        yield* comments;
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBe(2); // Should find the non-deleted comment
    });

    it("should handle comments with null or undefined content", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: test-id)";
      const commentsWithNullContent = [
        { ...createMockComment(1, ""), content: null },
        { ...createMockComment(2, ""), content: { raw: null } },
        { ...createMockComment(3, ""), content: { raw: undefined } },
        createMockComment(4, `Valid comment\n${identifierText}`),
      ];

      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        yield* commentsWithNullContent as MockComment[];
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBe(4); // Should find the valid comment
    });

    it("should handle empty comments list", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: test-id)";

      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        // Empty generator
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBeUndefined();
    });

    it("should return first matching comment when multiple matches exist", async () => {
      const identifierText = "[comment]: # (bitbucket-pipe-pr-comment: duplicate-id)";
      const comments = [
        createMockComment(1, "First comment without identifier"),
        createMockComment(2, `First match\n${identifierText}`),
        createMockComment(3, `Second match\n${identifierText}`),
      ];

      mockMakePaginatedRequest.mockImplementation(async function* (): AsyncGenerator<unknown, undefined, void> {
        yield* comments;
      });

      const result = await getExistingComment(mockAuth, mockPR, identifierText);

      expect(result).toBe(2); // Should return the first match
    });
  });

  describe("createComment", () => {
    it("should create a new comment with correct API call", async () => {
      const content = "This is a test comment";

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, mockPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle multiline content", async () => {
      const content = `Line 1
Line 2
Line 3

Line 5 with empty line above`;

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, mockPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle empty content", async () => {
      const content = "";

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, mockPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle content with special characters and markdown", async () => {
      const content = `# Test Comment

This is a **bold** comment with:
- Special characters: @#$%^&*()
- Code: \`console.log("hello")\`
- Link: [GitHub](https://github.com)

\`\`\`javascript
function test() {
  return "test";
}
\`\`\``;

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, mockPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should propagate errors from makeRequest", async () => {
      const content = "Test comment";
      const error = new Error("API Error");

      mockMakeRequest.mockRejectedValue(error);

      await expect(createComment(mockAuth, mockPR, content)).rejects.toThrow("API Error");
    });
  });

  describe("updateComment", () => {
    it("should update an existing comment with correct API call", async () => {
      const commentId = 456;
      const content = "Updated comment content";

      mockMakeRequest.mockResolvedValue(undefined);

      await updateComment(mockAuth, mockPR, commentId, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments/456",
        {
          method: "PUT",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle different comment IDs", async () => {
      const commentId = 999;
      const content = "Another update";

      mockMakeRequest.mockResolvedValue(undefined);

      await updateComment(mockAuth, mockPR, commentId, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments/999",
        {
          method: "PUT",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle multiline content updates", async () => {
      const commentId = 123;
      const content = `Updated content:

## Changes Made
- Fixed bug #1
- Added feature #2
- Updated documentation

See [PR details](https://example.com) for more info.`;

      mockMakeRequest.mockResolvedValue(undefined);

      await updateComment(mockAuth, mockPR, commentId, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments/123",
        {
          method: "PUT",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle empty content updates", async () => {
      const commentId = 789;
      const content = "";

      mockMakeRequest.mockResolvedValue(undefined);

      await updateComment(mockAuth, mockPR, commentId, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/test-workspace/test-repo/pullrequests/123/comments/789",
        {
          method: "PUT",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should propagate errors from makeRequest", async () => {
      const commentId = 456;
      const content = "Updated content";
      const error = new Error("Update failed");

      mockMakeRequest.mockRejectedValue(error);

      await expect(updateComment(mockAuth, mockPR, commentId, content)).rejects.toThrow("Update failed");
    });
  });

  describe("integration scenarios", () => {
    it("should work with different PR configurations", async () => {
      const differentPR: PRConfig = {
        id: 999,
        workspace: "different-workspace",
        repository: "different-repo",
      };

      const content = "Test content";

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, differentPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/different-workspace/different-repo/pullrequests/999/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });

    it("should handle special characters in workspace and repository names", async () => {
      const specialPR: PRConfig = {
        id: 42,
        workspace: "workspace-with-dashes",
        repository: "repo_with_underscores",
      };

      const content = "Test content";

      mockMakeRequest.mockResolvedValue(undefined);

      await createComment(mockAuth, specialPR, content);

      expect(mockMakeRequest).toHaveBeenCalledWith(
        mockAuth,
        "/repositories/workspace-with-dashes/repo_with_underscores/pullrequests/42/comments",
        {
          method: "POST",
          body: JSON.stringify({ content: { raw: content } }),
        },
      );
    });
  });
});
