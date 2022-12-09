export type GenericType = {
  [key: string]: GenericType;
} & {toString: () => string};
