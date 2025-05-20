import axios from "axios";
import path from "path";
import { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
import { jwtVerify, importJWK, JWTPayload, JWK } from "jose";

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID;
const JWKS_URI = `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

let cachedKeys: JWK[] | undefined = undefined;

async function fetchJWKS(): Promise<JWK[]> {
  if (cachedKeys) {
    return cachedKeys;
  }
  try {
    const response = await axios.get(JWKS_URI);
    const keys: JWK[] = response.data.keys;
    cachedKeys = keys;
    return keys;
  } catch (error) {
    console.error("Unable to fetch JWKS: ", error);
    throw new Error("Unable to fetch JWKS!");
  }
}

async function getSigningKey(kid: string) {
  const keys = await fetchJWKS();
  const signingKey = keys.find((key) => key.kid === kid);

  if (!signingKey) {
    throw new Error("No signing key found!");
  }

  return await importJWK(signingKey, "RS256");
}

async function verifyToken(token: string) {
  const decodedHeader = JSON.parse(
    Buffer.from(token.split(".")[0], "base64").toString(),
  );

  if (!decodedHeader.kid) {
    throw new Error("Invalid JWT: missing kid!");
  }

  const key = await getSigningKey(decodedHeader.kid);

  const { payload }: { payload: JWTPayload } = await jwtVerify(token, key, {
    algorithms: ["RS256"],
  });

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token has expired!");
  }

  const audience = payload.aud || payload.client_id;
  if (audience !== COGNITO_USER_POOL_CLIENT_ID) {
    throw new Error("Invalid audience!");
  }

  return payload;
}

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  let uri = request.uri;

  if (uri === "/") {
    uri = "/index.html";
  }

  const [uriWithoutQuery] = uri.split("?");
  const normalizedUri = path
    .normalize(decodeURIComponent(uriWithoutQuery))
    .toLowerCase();
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalizedUri);

  if (!hasExtension) {
    uri = `${uriWithoutQuery}.html${uri.includes("?") ? "?" + uri.split("?")[1] : ""}`;
  }

  request.uri = uri;

  // 💡 Ensure we match both /admin and /admin.html
  if (
    normalizedUri.startsWith("/admin") ||
    normalizedUri.startsWith("/admin.html")
  ) {
    const cookieHeader = headers["cookie"]?.[0]?.value;

    console.log("Cookie Header: ", cookieHeader);

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

    console.log("Token Match: ", tokenMatch?.[1]);

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
      console.error("JWT Verification Failed: ", {
        message: (error as Error).message,
        token,
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
