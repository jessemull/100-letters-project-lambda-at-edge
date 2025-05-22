import {
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontResultResponse,
} from "aws-lambda";
import { handler } from "./index";
import { jwtVerify } from "jose";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: () => jest.fn(),
}));

const mockToken = (overrides = {}) => ({
  token_use: "access",
  scope: "aws.cognito.signin.user.admin",
  ...overrides,
});

const getToken = (payloadOverrides = {}) => {
  (jwtVerify as jest.Mock).mockResolvedValue({
    payload: mockToken(payloadOverrides),
  });
  return "mocked.jwt.token";
};

const getMockEvent = (uri = "/admin", cookie?: string) =>
  ({
    Records: [
      {
        cf: {
          request: {
            uri,
            headers: cookie ? { cookie: [{ value: cookie }] } : {},
          },
        },
      },
    ],
  }) as unknown as CloudFrontRequestEvent;

describe("Lambda@Edge handler", () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COGNITO_USER_POOL_ID = "us-west-2_test";
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should return the request for non-admin URIs", async () => {
    const event = getMockEvent("/home");
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
  });

  it("should normalize and append .html if no extension", async () => {
    const event = getMockEvent("/about");
    const result = (await handler(event)) as CloudFrontRequest;
    expect(result?.uri).toBe("/about.html");
  });

  it("should preserve query string when adding .html", async () => {
    const event = getMockEvent("/about?foo=bar");
    const result = (await handler(event)) as CloudFrontRequest;
    expect(result?.uri).toBe("/about.html?foo=bar");
  });

  it("should handle uri with trailing slashes", async () => {
    const event = getMockEvent("/about////");
    const result = (await handler(event)) as CloudFrontRequest;
    expect(result?.uri).toBe("/about.html");
  });

  it("should return 403 if no cookie header", async () => {
    const event = getMockEvent("/admin");
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch(/No cookie found/);
  });

  it("should return 403 if cookie does not contain token", async () => {
    const event = getMockEvent("/admin", "some=thing");
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch(/Token not found/);
  });

  it("should return 403 if token_use is not 'access'", async () => {
    getToken({ token_use: "id" });
    const event = getMockEvent(
      "/admin",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch("Access denied! Invalid token.");
  });

  it("should return 403 if scope is not a string", async () => {
    getToken({ scope: 123 });
    const event = getMockEvent(
      "/admin",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch("Access denied! Invalid token.");
  });

  it("should return 403 if scope doesn't contain required permission", async () => {
    getToken({ scope: "read write" });
    const event = getMockEvent(
      "/admin",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch("Access denied! Invalid token.");
  });

  it("should return 403 if jwtVerify throws", async () => {
    (jwtVerify as jest.Mock).mockRejectedValue(new Error("verify error"));
    const event = getMockEvent(
      "/admin",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toMatch(/Invalid token/);
  });

  it("should allow request through if token is valid", async () => {
    getToken();
    const event = getMockEvent(
      "/admin",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
  });
});
