import axios from "axios";
import path from "path";
import { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";
import { jwtVerify, importJWK } from "jose";

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID;
const JWKS_URI = `https://cognito-idp.us-west-2.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

async function fetchJWKS() {
  try {
    const response = await axios.get(JWKS_URI);
    return response.data.keys;
  } catch (error) {
    console.error("Unable to fetch JWKS: ", error);
    throw new Error("Unable to fetch JWKS!");
  }
}

async function getSigningKey(kid: string) {
  const keys = await fetchJWKS();
  const signingKey = keys.find((key: { kid: string }) => key.kid === kid);

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

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["RS256"] });

    if (payload.aud !== COGNITO_USER_POOL_CLIENT_ID) {
      throw new Error("Invalid audience");
    }

    return payload;
  } catch (error) {
    throw new Error("JWT verification failed: " + (error as Error).message);
  }
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

  if (normalizedUri.startsWith("/admin")) {
    const cookieHeader = headers["cookie"]?.[0]?.value;

    if (!cookieHeader) {
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied!",
      };
    }

    const tokenMatch = cookieHeader.match(
      /100_letters_cognito_id_token=([^;]+)/,
    );

    if (!tokenMatch) {
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied!",
      };
    }

    const token = tokenMatch[1];

    try {
      await verifyToken(token);
      return request;
    } catch (error) {
      console.error("JWT Verification Failed: ", error);
      return {
        status: "403",
        statusDescription: "Forbidden",
        body: "Access denied!",
      };
    }
  }

  return request;
};
