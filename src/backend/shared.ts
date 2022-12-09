import * as LKE from '@linkurious/rest-client';

/*
 * parseLinkuriousAPI
 *
 * Generic error handling for calling Linkurious Enterprise APIs
 */
export async function parseLinkuriousAPI<
  T extends LKE.Response<unknown>,
  E,
  Body = Exclude<T, LKE.ErrorResponses<LKE.LkErrorKey>>['body']
>(
  apiPromise: Promise<T>,
  transform?: (body: Exclude<T, LKE.ErrorResponses<LKE.LkErrorKey>>['body']) => E,
  errorHandler: (e: LKE.Response<LKE.LkError>) => E = (e) => {
    throw e;
  }
): Promise<Body extends E ? Body : E> {
  let result: Body extends E ? Body : E;
  const apiResponse = await apiPromise;

  if (apiResponse.isSuccess()) {
    result = (transform ? transform(apiResponse.body as Body) : apiResponse.body) as Body extends E
      ? Body
      : E;
  } else {
    result = errorHandler(apiResponse as LKE.Response<LKE.LkError>) as Body extends E ? Body : E;
  }

  return result;
}

/*
 * Apply template format for logging
 */
export function loggerFormatter(func: (...data: unknown[]) => void): (...data: unknown[]) => void {
  const newFunction = (...args: unknown[]) => {
    const newArgs = Array.from(args);
    newArgs.unshift(new Date().toISOString(), '-');
    func.apply(console, <[unknown?, ...unknown[]]>newArgs);
  };

  return newFunction;
}
