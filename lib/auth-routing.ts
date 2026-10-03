export type AuthMode = "signin" | "signup";

type SearchParamValue = string | string[] | undefined;
export type PageSearchParams = Record<string, SearchParamValue>;

type SearchParamsInput = Promise<PageSearchParams> | PageSearchParams | undefined;

const readSingleValue = (value: SearchParamValue): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }
  return null;
};

const isAuthMode = (value: string | null): value is AuthMode =>
  value === "signin" || value === "signup";

const toSafePath = (value: string | null) => {
  if (!value) return null;
  // "/\evil.com" is treated like "//evil.com" by browsers.
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
};

export const resolveSearchParams = async (input: SearchParamsInput): Promise<PageSearchParams> => {
  return Promise.resolve(input ?? {});
};

export const getAuthMode = (params: PageSearchParams, fallback: AuthMode = "signin"): AuthMode => {
  const value = readSingleValue(params.mode);
  return isAuthMode(value) ? value : fallback;
};

export const getNextPath = (params: PageSearchParams) => {
  return toSafePath(readSingleValue(params.next));
};
