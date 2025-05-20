import axios from "axios";
import { CloudFrontRequestEvent, CloudFrontResultResponse } from "aws-lambda";
import { handler } from "./index";
import { jwtVerify, importJWK } from "jose";

jest.mock("axios");
jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  importJWK: jest.fn(),
}));

const getToken = (
  aud = process.env.COGNITO_USER_POOL_CLIENT_ID,
  kid = "mocked-kid",
) =>
  [
    Buffer.from(JSON.stringify({ alg: "RS256", kid })).toString("base64"),
    Buffer.from(
      JSON.stringify({
        aud,
      }),
    ).toString("base64"),
    "signature",
  ].join(".");

const getMockEvent = (cookieValue?: string, uri = "/admin/some/path") =>
  ({
    Records: [
      {
        cf: {
          request: {
            uri,
            headers: cookieValue ? { cookie: [{ value: cookieValue }] } : {},
          },
        },
      },
    ],
  }) as unknown as CloudFrontRequestEvent;

describe("Lambda handler tests", () => {
  beforeEach(() => {
    console.error = jest.fn();
    jest.resetModules();
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should forward the request if the URI is not an admin path", async () => {
    const event = getMockEvent();
    event.Records[0].cf.request.uri = "/non-admin-path";
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
  });

  it("should return 403 if cookie header is missing", async () => {
    const event = getMockEvent();
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should return 403 if token is missing in the cookie", async () => {
    const event = getMockEvent("some_other_cookie=value");
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should return 403 when JWT verification fails", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockRejectedValue(new Error("Invalid JWT!"));
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const event = getMockEvent(
      "100_letters_cognito_access_token=invalid.token",
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should catch errors from JWT verify", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockRejectedValue(new Error("Network issues!"));
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should forward the request if JWT verification is successful", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { aud: process.env.COGNITO_USER_POOL_CLIENT_ID },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
    );

    // Prepare expected request with normalized URI like handler does
    const expectedRequest = { ...event.Records[0].cf.request };
    const uriWithoutQuery = expectedRequest.uri.split("?")[0];
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(uriWithoutQuery);
    if (!hasExtension) {
      expectedRequest.uri =
        uriWithoutQuery +
        ".html" +
        (expectedRequest.uri.includes("?")
          ? "?" + expectedRequest.uri.split("?")[1]
          : "");
    }

    const result = await handler(event);
    expect(result).toEqual(expectedRequest);
  });

  it("should handle query params if JWT verification is successful", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { aud: process.env.COGNITO_USER_POOL_CLIENT_ID },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const uri = "/admin/some/path?key=value";
    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
      uri,
    );

    const expectedRequest = { ...event.Records[0].cf.request };
    const uriWithoutQuery = expectedRequest.uri.split("?")[0];
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(uriWithoutQuery);
    if (!hasExtension) {
      expectedRequest.uri =
        uriWithoutQuery +
        ".html" +
        (expectedRequest.uri.includes("?")
          ? "?" + expectedRequest.uri.split("?")[1]
          : "");
    }

    const result = await handler(event);
    expect(result).toEqual(expectedRequest);
  });

  it("should handle request for root directory", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { aud: process.env.COGNITO_USER_POOL_CLIENT_ID },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
      "/",
    );
    const result = await handler(event);
    expect(result).toEqual(event.Records[0].cf.request);
  });

  it("should handle errors fetching jwks", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { aud: "invalid-audience" },
    });
    (axios.get as jest.Mock).mockRejectedValue(new Error("Network out!"));

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should return 403 if JWT audience is invalid", async () => {
    (importJWK as jest.Mock).mockResolvedValue("mocked-key");
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { aud: "invalid-audience" },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [{ kid: "mocked-kid", alg: "RS256" }] },
    });

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should return 403 if no signing key is found", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { keys: [] },
    });

    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken()}`,
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it('should return 403 if token is missing "kid" header', async () => {
    (jwtVerify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid JWT: Missing kid");
    });
    const event = getMockEvent(
      `100_letters_cognito_access_token=${getToken(undefined, "")}`,
    );
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });

  it("should return 403 on uncaught errors", async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error("Bad call!"));
    const event = getMockEvent("100_letters_cognito_access_token=valid.token");
    const result = (await handler(event)) as CloudFrontResultResponse;
    expect(result.status).toBe("403");
    expect(result.body).toBe("Access denied!");
  });
});
