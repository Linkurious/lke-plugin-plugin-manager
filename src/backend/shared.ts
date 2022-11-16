import * as lke from "@linkurious/rest-client";

/*
 * parseLinkuriousAPI
 *
 * Generic error handling for calling Linkurious Enterprise APIs
 */
export async function parseLinkuriousAPI<
  T extends lke.Response<unknown>,
  E,
  Body = Exclude<T, lke.ErrorResponses<lke.LkErrorKey>>["body"]
>(
  apiPromise: Promise<T>,
  transform?: (body: Exclude<T, lke.ErrorResponses<lke.LkErrorKey>>["body"]) => E,
  errorHandler: (e: lke.Response<lke.LkError>) => E = e => { throw e; }
): Promise<Body extends E ? Body : E> {
  let result: Body extends E ? Body : E;
  const apiResponse = await apiPromise;

  if (apiResponse.isSuccess())
    result = (transform ? transform(apiResponse.body as Body) : apiResponse.body) as Body extends E ? Body : E;
  else
    result = errorHandler(apiResponse as lke.Response<lke.LkError>) as Body extends E ? Body : E;

  return result;
}
