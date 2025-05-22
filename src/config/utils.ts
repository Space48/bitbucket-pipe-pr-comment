import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

export function getRequiredValue(key: string, errorMessage?: string): string {
  const value = process.env[key];

  if (!value) throw new Error(errorMessage ?? `Missing required configuration variable: ${key}`);

  return value;
}

export function getEnumValue<Options extends string[]>(
  key: string,
  options: Options,
  defaultValue?: Options[number],
): Options[number] {
  const value = process.env[key] ? process.env[key].toLowerCase() : undefined;

  if (!value && defaultValue) return defaultValue;

  if (!value) throw new Error(`Missing required configuration variable: ${key}`);

  if (!options.includes(value))
    throw new Error(`Invalid value for ${key}: ${value}. Expected one of: ${options.join(", ")}.`);

  return value;
}

export function getOptionalValue(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];

  return value ?? defaultValue;
}

export function getFileValue(filePath: string): string {
  const absolutePath = resolve(cwd(), filePath);

  try {
    return readFileSync(absolutePath, "utf-8");
  } catch {
    throw new Error(`Failed to read file ${absolutePath}: File does not exist or is not readable.`);
  }
}
