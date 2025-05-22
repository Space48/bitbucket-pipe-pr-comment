import { AuthConfig } from "../config/auth";
import { BitbucketApiError, makePaginatedRequest, makeRequest } from "./api";

// Mock fetch globally so we don't make any network requests while testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Create a mock Response object, since the real one does not allow specifying the URL
const createMockResponse = (
  data: string | Record<string, unknown>,
  options: { ok?: boolean; status?: number; url?: string } = {},
) => {
  const { ok = true, status = 200, url = "https://api.bitbucket.org/2.0/test" } = options;
  return {
    ok,
    status,
    url,
    text: jest
      .fn<Promise<string>, any, never>()
      .mockResolvedValue(typeof data === "string" ? data : JSON.stringify(data)),
  };
};

describe("Bitbucket API", () => {
  const mockAuth: AuthConfig = {
    username: "testuser",
    password: "testpass",
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("BitbucketApiError", () => {
    it("should create error with all properties", () => {
      const detail = { field: "test", code: 123 };
      const error = new BitbucketApiError("Test message", 400, "https://api.test.com", "response body", detail);

      expect(error.message).toBe("Test message");
      expect(error.status).toBe(400);
      expect(error.url).toBe("https://api.test.com");
      expect(error.body).toBe("response body");
      expect(error.detail).toEqual(detail);
      expect(error).toBeInstanceOf(Error);
    });

    it("should create error with default empty detail", () => {
      const error = new BitbucketApiError("Test message", 404, "https://api.test.com", "not found");

      expect(error.detail).toEqual({});
    });
  });

  describe("makeRequest", () => {
    it("should make successful request with string path", async () => {
      const mockResponse = { id: 1, name: "test" };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await makeRequest(mockAuth, "test/path");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(new URL("https://api.bitbucket.org/2.0/test/path"), {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from("testuser:testpass").toString("base64")}`,
        },
      });
    });

    it("should make successful request with URL object", async () => {
      const mockResponse = { data: "test" };
      const testUrl = new URL("https://custom.api.com/test");

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, { url: testUrl.href }));

      const result = await makeRequest(mockAuth, testUrl);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(testUrl, expect.any(Object));
    });

    it("should include Content-Type header when body is provided", async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, { status: 201 }));

      const requestBody = JSON.stringify({ data: "test" });
      await makeRequest(mockAuth, "test", {
        method: "POST",
        body: requestBody,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          method: "POST",
          body: requestBody,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: expect.stringContaining("Basic"),
          }),
        }),
      );
    });

    it("should merge custom headers with default headers", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await makeRequest(mockAuth, "test", {
        headers: {
          "Custom-Header": "custom-value",
          Accept: "application/xml", // Should override default
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/xml",
            Authorization: expect.stringContaining("Basic"),
            "Custom-Header": "custom-value",
          }),
        }),
      );
    });

    it("should throw BitbucketApiError for invalid JSON response", async () => {
      mockFetch.mockResolvedValue(createMockResponse("invalid json {"));

      await expect(makeRequest(mockAuth, "test")).rejects.toThrow(BitbucketApiError);
      await expect(makeRequest(mockAuth, "test")).rejects.toThrow("Response did not contain valid JSON data.");
    });

    it("should throw BitbucketApiError for HTTP error responses", async () => {
      const errorResponse = {
        type: "error",
        error: {
          message: "Resource not found",
          code: "NOT_FOUND",
          detail: "The requested resource does not exist",
        },
      };

      mockFetch.mockResolvedValue(createMockResponse(errorResponse, { ok: false, status: 404 }));

      await expect(makeRequest(mockAuth, "test")).rejects.toThrow(BitbucketApiError);

      try {
        await makeRequest(mockAuth, "test");
      } catch (error) {
        expect(error).toBeInstanceOf(BitbucketApiError);
        expect((error as BitbucketApiError).message).toBe("Resource not found");
        expect((error as BitbucketApiError).status).toBe(404);
        expect((error as BitbucketApiError).detail).toEqual({
          code: "NOT_FOUND",
          detail: "The requested resource does not exist",
        });
      }
    });

    it("should generate correct Basic Auth header", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      await makeRequest(mockAuth, "test");

      const expectedAuth = `Basic ${Buffer.from("testuser:testpass").toString("base64")}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });
  });

  describe("makePaginatedRequest", () => {
    it("should yield all items from a single page", async () => {
      const mockResponse = {
        values: [{ id: 1 }, { id: 2 }, { id: 3 }],
        size: 3,
        page: 1,
        pagelen: 10,
        next: undefined,
        prev: undefined,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const results = [];
      for await (const item of makePaginatedRequest(mockAuth, "test")) {
        results.push(item);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should yield items from multiple pages", async () => {
      const page1Response = {
        values: [{ id: 1 }, { id: 2 }],
        size: 2,
        page: 1,
        pagelen: 2,
        next: "https://api.bitbucket.org/2.0/test?page=2",
        prev: undefined,
      };

      const page2Response = {
        values: [{ id: 3 }, { id: 4 }],
        size: 2,
        page: 2,
        pagelen: 2,
        next: "https://api.bitbucket.org/2.0/test?page=3",
        prev: "https://api.bitbucket.org/2.0/test?page=1",
      };

      const page3Response = {
        values: [{ id: 5 }],
        size: 1,
        page: 3,
        pagelen: 2,
        next: undefined,
        prev: "https://api.bitbucket.org/2.0/test?page=2",
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(page1Response))
        .mockResolvedValueOnce(createMockResponse(page2Response, { url: "https://api.bitbucket.org/2.0/test?page=2" }))
        .mockResolvedValueOnce(createMockResponse(page3Response, { url: "https://api.bitbucket.org/2.0/test?page=3" }));

      const results = [];
      for await (const item of makePaginatedRequest(mockAuth, "test")) {
        results.push(item);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify the URLs called
      expect(mockFetch).toHaveBeenNthCalledWith(1, new URL("https://api.bitbucket.org/2.0/test"), expect.any(Object));
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        new URL("https://api.bitbucket.org/2.0/test?page=2"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        new URL("https://api.bitbucket.org/2.0/test?page=3"),
        expect.any(Object),
      );
    });

    it("should handle empty pages", async () => {
      const mockResponse = {
        values: [],
        size: 0,
        page: 1,
        pagelen: 10,
        next: undefined,
        prev: undefined,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const results = [];
      for await (const item of makePaginatedRequest(mockAuth, "test")) {
        results.push(item);
      }

      expect(results).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should pass through request init options", async () => {
      const mockResponse = {
        values: [{ id: 1 }],
        size: 1,
        page: 1,
        pagelen: 10,
        next: undefined,
        prev: undefined,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const customInit = {
        method: "POST",
        headers: { "Custom-Header": "value" },
      };

      const results = [];
      for await (const item of makePaginatedRequest(mockAuth, "test", customInit)) {
        results.push(item);
      }

      expect(results).toEqual([{ id: 1 }]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Custom-Header": "value",
            Accept: "application/json",
            Authorization: expect.stringContaining("Basic"),
          }),
        }),
      );
    });

    it("should propagate errors from makeRequest", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {
            type: "error",
            error: { message: "Unauthorized" },
          },
          { ok: false, status: 401 },
        ),
      );

      const generator = makePaginatedRequest(mockAuth, "test");

      await expect(generator.next()).rejects.toThrow(BitbucketApiError);
    });
  });
});
