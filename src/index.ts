import path from "path";
import { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
import { jwtVerify, createRemoteJWKSet } from "jose";

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const JWKS_URI = `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ["RS256"],
    issuer: `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}`,
  });

  if (payload.token_use !== "access") {
    throw new Error("Invalid token use: expected access token");
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
  return uri.toLowerCase().startsWith("/admin");
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  let uri = request.uri;

  const [uriWithoutQuery] = uri.split("?");
  const normalizedUri = path
    .normalize(decodeURIComponent(uriWithoutQuery))
    .replace(/\/+$/, "")
    .toLowerCase();

  const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalizedUri);
  if (!hasExtension) {
    uri = `${normalizedUri}.html${uri.includes("?") ? "?" + uri.split("?")[1] : ""}`;
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

    const token = tokenMatch[1];

    try {
      await verifyToken(token);
      return request;
    } catch (error) {
      console.error("JWT Verification Failed:", {
        message: (error as Error).message,
      });
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied! Invalid token.",
      };
    }
  }

  return request;
};
