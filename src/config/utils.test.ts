import { unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEnumValue, getFileValue, getOptionalValue, getRequiredValue } from "./utils";

describe("Config Utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("getRequiredValue", () => {
    it("should return the environment variable value when it exists", () => {
      process.env.TEST_VAR = "test-value";
      expect(getRequiredValue("TEST_VAR")).toBe("test-value");
    });

    it("should throw an error when environment variable is missing", () => {
      delete process.env.TEST_VAR;
      expect(() => getRequiredValue("TEST_VAR")).toThrow("Missing required configuration variable: TEST_VAR");
    });

    it("should throw a custom error message when provided", () => {
      delete process.env.TEST_VAR;
      const customMessage = "Custom error message";
      expect(() => getRequiredValue("TEST_VAR", customMessage)).toThrow(customMessage);
    });

    it("should throw an error when environment variable is empty string", () => {
      process.env.TEST_VAR = "";
      expect(() => getRequiredValue("TEST_VAR")).toThrow("Missing required configuration variable: TEST_VAR");
    });
  });

  describe("getEnumValue", () => {
    const options = ["option1", "option2", "option3"];

    it("should return the environment variable value when it matches an option", () => {
      process.env.TEST_ENUM = "option2";
      expect(getEnumValue("TEST_ENUM", options)).toBe("option2");
    });

    it("should handle case insensitive matching", () => {
      process.env.TEST_ENUM = "OPTION1";
      expect(getEnumValue("TEST_ENUM", options)).toBe("option1");
    });

    it("should return default value when environment variable is missing and default is provided", () => {
      delete process.env.TEST_ENUM;
      expect(getEnumValue("TEST_ENUM", options, "option3")).toBe("option3");
    });

    it("should throw an error when environment variable is missing and no default provided", () => {
      delete process.env.TEST_ENUM;
      expect(() => getEnumValue("TEST_ENUM", options)).toThrow("Missing required configuration variable: TEST_ENUM");
    });

    it("should throw an error when environment variable value is not in options", () => {
      process.env.TEST_ENUM = "invalid-option";
      expect(() => getEnumValue("TEST_ENUM", options)).toThrow(
        "Invalid value for TEST_ENUM: invalid-option. Expected one of: option1, option2, option3.",
      );
    });
  });

  describe("getOptionalValue", () => {
    it("should return the environment variable value when it exists", () => {
      process.env.TEST_OPTIONAL = "optional-value";
      expect(getOptionalValue("TEST_OPTIONAL")).toBe("optional-value");
    });

    it("should return undefined when environment variable is missing and no default provided", () => {
      delete process.env.TEST_OPTIONAL;
      expect(getOptionalValue("TEST_OPTIONAL")).toBeUndefined();
    });

    it("should return default value when environment variable is missing and default is provided", () => {
      delete process.env.TEST_OPTIONAL;
      expect(getOptionalValue("TEST_OPTIONAL", "default-value")).toBe("default-value");
    });

    it("should return empty string when environment variable is empty string", () => {
      process.env.TEST_OPTIONAL = "";
      expect(getOptionalValue("TEST_OPTIONAL")).toBe("");
    });
  });

  describe("getFileValue", () => {
    const testFilePath = resolve(process.cwd(), "test-file.txt");
    const testContent = "This is test file content";

    beforeEach(() => {
      // Create a test file
      writeFileSync(testFilePath, testContent, "utf-8");
    });

    afterEach(() => {
      // Clean up test file
      try {
        unlinkSync(testFilePath);
      } catch {
        // File might not exist, ignore
      }
    });

    it("should read and return file content when file exists", () => {
      expect(getFileValue("test-file.txt")).toBe(testContent);
    });

    it("should throw an error when file does not exist", () => {
      expect(() => getFileValue("non-existent-file.txt")).toThrow(
        /Failed to read file .*non-existent-file\.txt: File does not exist or is not readable\./,
      );
    });

    it("should handle absolute paths", () => {
      expect(getFileValue(testFilePath)).toBe(testContent);
    });
  });
});
