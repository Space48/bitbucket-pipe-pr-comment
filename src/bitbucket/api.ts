import { AuthConfig } from "../config";

const API_BASE_URL = "https://api.bitbucket.org/2.0";

type BitbucketErrorResponse = {
  type: string;
  error: {
    message: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type BitbucketPaginatedResponse<T> = {
  values: T[];
  size: number;
  page: number;
  pagelen: number;
  next: string | undefined;
  prev: string | undefined;
};

export class BitbucketApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body: string,
    public readonly detail: Partial<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export async function makeRequest<T>(auth: AuthConfig, pathOrUrl: string | URL, init: RequestInit = {}) {
  const url = pathOrUrl instanceof URL ? pathOrUrl : new URL(`${API_BASE_URL}/${pathOrUrl}`);
  const defaultOptions: RequestInit = {
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeaderValue(auth),
      ...(init.body && { "Content-Type": "application/json" }),
    },
  };
  const { headers: initHeaders, ...initWithoutHeaders } = init;

  const mergedConfig: RequestInit = {
    ...defaultOptions,
    ...initWithoutHeaders,
    headers: {
      ...defaultOptions.headers,
      ...initHeaders,
    },
  };

  const response = await fetch(url, mergedConfig);

  return parseResponse<T>(response);
}

export async function* makePaginatedRequest<T>(
  auth: AuthConfig,
  path: string,
  init: RequestInit = {},
): AsyncGenerator<T, undefined, void> {
  let next: string | URL | undefined = path;

  while (next) {
    const response: BitbucketPaginatedResponse<T> = await makeRequest<BitbucketPaginatedResponse<T>>(auth, next, init);

    yield* response.values;

    next = response.next ? new URL(response.next) : undefined;
  }
}

function getAuthHeaderValue(auth: AuthConfig): string {
  // HTTP Basic Auth using username and password
  return `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
}

async function parseResponse<T>(response: Response) {
  const body = await response.text();

  let data: T | BitbucketErrorResponse;

  try {
    data = JSON.parse(body);
  } catch {
    throw new BitbucketApiError("Response did not contain valid JSON data.", response.status, response.url, body);
  }

  if (response.ok) return data as T;

  const { message, ...detail } = (data as BitbucketErrorResponse).error;

  throw new BitbucketApiError(message, response.status, response.url, body, detail);
}
