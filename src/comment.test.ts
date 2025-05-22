import { getCommentContent, getFormattedIdentifier } from "./comment";
import { CommentConfig } from "./config/comment";

describe("Comment Functions", () => {
  describe("getFormattedIdentifier", () => {
    it("should format identifier as a Markdown comment", () => {
      const identifier = "test-identifier";
      const result = getFormattedIdentifier(identifier);

      expect(result).toBe("\n[comment]: # (bitbucket-pipe-pr-comment: test-identifier)");
    });

    it("should handle special characters in identifier", () => {
      const identifier = "test-123_special.chars";
      const result = getFormattedIdentifier(identifier);

      expect(result).toBe("\n[comment]: # (bitbucket-pipe-pr-comment: test-123_special.chars)");
    });

    it("should handle empty identifier", () => {
      const identifier = "";
      const result = getFormattedIdentifier(identifier);

      expect(result).toBe("\n[comment]: # (bitbucket-pipe-pr-comment: )");
    });
  });

  describe("getCommentContent", () => {
    it("should return content without identifier when no identifier is provided", () => {
      const config: CommentConfig = {
        content: "Hello, world!",
        identifier: undefined,
      };

      const result = getCommentContent(config);

      expect(result).toBe("Hello, world!");
    });

    it("should return content with formatted identifier when identifier is provided", () => {
      const config: CommentConfig = {
        content: "Hello, world!",
        identifier: "test-id",
      };

      const result = getCommentContent(config);

      expect(result).toBe("Hello, world!\n\n[comment]: # (bitbucket-pipe-pr-comment: test-id)");
    });

    it("should handle empty content with identifier", () => {
      const config: CommentConfig = {
        content: "",
        identifier: "test-id",
      };

      const result = getCommentContent(config);

      expect(result).toBe("\n\n[comment]: # (bitbucket-pipe-pr-comment: test-id)");
    });

    it("should handle multiline content with identifier", () => {
      const config: CommentConfig = {
        content: "Line 1\nLine 2\nLine 3",
        identifier: "multiline-test",
      };

      const result = getCommentContent(config);

      expect(result).toBe("Line 1\nLine 2\nLine 3\n\n[comment]: # (bitbucket-pipe-pr-comment: multiline-test)");
    });
  });
});
