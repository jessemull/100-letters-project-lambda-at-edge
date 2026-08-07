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

const TEST_CLIENT_ID = "test-client-id";

const mockToken = (overrides = {}) => ({
  token_use: "access",
  scope: "aws.cognito.signin.user.admin",
  client_id: TEST_CLIENT_ID,
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
    process.env.COGNITO_USER_POOL_CLIENT_ID = TEST_CLIENT_ID;
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should return the request for non-admin URIs", async () => {
    const event = getMockEvent("/");
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
  });

  it("should not treat /administrator as an admin path", async () => {
    const event = getMockEvent("/administrator");
    const result = (await handler(event)) as CloudFrontRequest;
    expect(result?.uri).toBe("/administrator.html");
    expect(jwtVerify).not.toHaveBeenCalled();
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

  it("should tolerate malformed percent-encoding in the URI", async () => {
    const event = getMockEvent("/about%E0%A4%A");
    const result = (await handler(event)) as CloudFrontRequest;
    expect(result?.uri).toMatch(/\.html$/);
  });

  it("should return 400 if CloudFront records are missing", async () => {
    const event = { Records: [] } as unknown as CloudFrontRequestEvent;
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("400");
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

  it("should return 403 if client_id does not match", async () => {
    getToken({ client_id: "other-client" });
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

  it("should decode percent-encoded cookie token values", async () => {
    getToken();
    const encoded = encodeURIComponent("mocked.jwt.token");
    const event = getMockEvent(
      "/admin",
      `100_letters_cognito_access_token=${encoded}`,
    );
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
    expect(jwtVerify).toHaveBeenCalledWith(
      "mocked.jwt.token",
      expect.anything(),
      expect.anything(),
    );
  });

  it("should protect nested admin paths", async () => {
    getToken();
    const event = getMockEvent(
      "/admin/letters",
      "100_letters_cognito_access_token=mocked.jwt.token",
    );
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
    expect(jwtVerify).toHaveBeenCalled();
  });

  it("should redirect non-canonical domain to canonical domain (root)", async () => {
    const event = getMockEvent("/");
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    event.Records[0].cf.request.headers["cloudfront-forwarded-proto"] = [
      { value: "https" },
    ];
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      statusDescription: "Moved Permanently",
      headers: {
        location: [
          {
            key: "Location",
            value: "https://www.onehundredletters.com/",
          },
        ],
      },
    });
  });

  it("should redirect non-canonical domain to canonical domain (with path and query)", async () => {
    const event = getMockEvent("/about?foo=bar");
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    event.Records[0].cf.request.headers["cloudfront-forwarded-proto"] = [
      { value: "https" },
    ];
    event.Records[0].cf.request.querystring = "foo=bar";
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      statusDescription: "Moved Permanently",
      headers: {
        location: [
          {
            key: "Location",
            value: "https://www.onehundredletters.com/about.html?foo=bar",
          },
        ],
      },
    });
  });

  it("should redirect and not append .html if path already has extension", async () => {
    const event = getMockEvent("/foo.json");
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      headers: {
        location: [
          {
            value: "https://www.onehundredletters.com/foo.json",
          },
        ],
      },
    });
  });

  it("should redirect to '/' if request.uri is undefined", async () => {
    const event = getMockEvent();
    event.Records[0].cf.request.uri = "";
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      headers: {
        location: [
          {
            value: "https://www.onehundredletters.com/",
          },
        ],
      },
    });
  });

  it("should default to https if cloudfront-forwarded-proto header is missing", async () => {
    const event = getMockEvent("/foo");
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      headers: {
        location: [
          {
            value: "https://www.onehundredletters.com/foo.html",
          },
        ],
      },
    });
  });

  it("should handle redirect with only '?' as query string", async () => {
    const event = getMockEvent("/foo?");
    event.Records[0].cf.request.headers["host"] = [
      { value: "onehundredletters.com" },
    ];
    event.Records[0].cf.request.querystring = "";
    const result = await handler(event);
    expect(result).toMatchObject({
      status: "301",
      headers: {
        location: [
          {
            value: "https://www.onehundredletters.com/foo.html",
          },
        ],
      },
    });
  });
});
