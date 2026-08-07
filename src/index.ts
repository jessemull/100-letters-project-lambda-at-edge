import path from "path";
import { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
import { jwtVerify, createRemoteJWKSet } from "jose";

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID;
const JWKS_URI = `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(uriPath: string): string {
  const [uriWithoutQuery] = uriPath.split("?");

  return path
    .normalize(safeDecodeURIComponent(uriWithoutQuery))
    .replace(/\/+$/, "")
    .toLowerCase();
}

function pathWithHtmlExtension(normalizedUri: string): string {
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalizedUri);
  return hasExtension ? normalizedUri : `${normalizedUri}.html`;
}

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ["RS256"],
    issuer: `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}`,
  });

  if (payload.token_use !== "access") {
    throw new Error("Invalid token use: expected access token");
  }

  // Cognito access tokens use client_id (not aud) for the app client.
  if (payload.client_id !== COGNITO_USER_POOL_CLIENT_ID) {
    throw new Error("Invalid client!");
  }

  if (
    typeof payload.scope !== "string" ||
    !payload.scope.split(" ").includes("aws.cognito.signin.user.admin")
  ) {
    throw new Error("Insufficient permissions!");
  }

  return payload;
}

function isAdminPath(uri: string): boolean {
  const normalized = uri.toLowerCase();
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const record = event.Records?.[0];

  if (!record?.cf?.request) {
    return {
      status: "400",
      statusDescription: "Bad Request",
      body: "Invalid CloudFront event.",
    };
  }

  const request = record.cf.request;
  const headers = request.headers;

  // Redirect non-canonical domain to canonical domain...

  const hostHeader = headers["host"]?.[0]?.value;

  if (hostHeader === "onehundredletters.com") {
    const protocol =
      headers["cloudfront-forwarded-proto"]?.[0]?.value || "https";

    let requestPath = request.uri || "/";
    let redirectPath: string;

    if (requestPath === "/") {
      redirectPath = "/";
    } else {
      redirectPath = pathWithHtmlExtension(normalizePath(requestPath));
    }

    const querystring = request.querystring ? `?${request.querystring}` : "";

    return {
      status: "301",
      statusDescription: "Moved Permanently",
      headers: {
        location: [
          {
            key: "Location",
            value: `${protocol}://www.onehundredletters.com${redirectPath}${querystring}`,
          },
        ],
      },
    };
  }

  if (request.uri === "/") {
    request.uri = "/index.html";
  }

  let uri = request.uri;

  const normalizedUri = normalizePath(uri);
  const queryIndex = uri.indexOf("?");
  const querySuffix = queryIndex >= 0 ? uri.slice(queryIndex) : "";

  if (!/\.[a-zA-Z0-9]+$/.test(normalizedUri)) {
    uri = `${normalizedUri}.html${querySuffix}`;
  } else {
    uri = `${normalizedUri}${querySuffix}`;
  }

  request.uri = uri;

  if (isAdminPath(normalizedUri)) {
    const cookieHeader = headers["cookie"]?.[0]?.value;

    if (!cookieHeader) {
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied! No cookie found.",
      };
    }

    const tokenMatch = cookieHeader.match(
      /(?:^|;\s*)100_letters_cognito_access_token=([^;]+)/,
    );

    if (!tokenMatch) {
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied! Token not found in cookies.",
      };
    }

    // Client sets this cookie with encodeURIComponent (js-cookie / AuthProvider).
    const token = safeDecodeURIComponent(tokenMatch[1]);

    try {
      await verifyToken(token);
      return request;
    } catch (error) {
      console.error("JWT Verification Failed: ", (error as Error).message);
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied! Invalid token.",
      };
    }
  }

  return request;
};
