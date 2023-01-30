export type GenericType = {
  [key: string]: GenericType;
} & {toString: () => string};

export const enum ErrorType {
  UNHANDLED = 'Unhandled Error',
  GENERIC = 'Generic Error',
  UNAUTHORIZED = 'Unauthorized',
  UPLOAD_FAILED = 'Upload failed',
  INVALID_PARAMETER = 'Invalid parameter',
  INVALID_PLUGIN = 'Invalid plugin',
  INVALID_ACTION = 'Invalid action'
}

export class PluginError extends Error {
  public name: ErrorType;
  protected httpResponseCode: number;

  public getHttpResponseCode(): number {
    return this.httpResponseCode;
  }

  constructor(message?: string) {
    super(message || 'An unknown issue happend on the system, contact the system administrator.');
    this.httpResponseCode = 500;
    this.name = ErrorType.UNHANDLED;
  }

  static parseError(e: unknown): PluginError {
    let internalError: PluginError;
    if (e instanceof PluginError) {
      internalError = e;
    } else if (e instanceof Error) {
      internalError = new PluginError(`${e.name} - ${e.message}`);
      internalError.stack = e.stack;
    } else if ((<GenericType>e)?.originalResponse?.body !== undefined) {
      // To intercept LKE API Errors
      console.error('Exception occurred in an API call:', (<GenericType>e).originalResponse.body);
      internalError = new GenericPluginError(
        'Exception occurred in an API call, check the logs for more details.'
      );
    } else {
      // Generic parser
      internalError = new PluginError(
        (<GenericType>e)?.message?.toString !== undefined
          ? (<GenericType>e).message.toString()
          : JSON.stringify(e)
      );
    }

    return internalError;
  }
}

export class GenericPluginError extends PluginError {
  constructor(message: string) {
    super(message);
    this.httpResponseCode = 500;
    this.name = ErrorType.GENERIC;
  }
}

export class UnauthorizedPluginError extends PluginError {
  constructor(roles: string[]) {
    super(
      `The user has not the rights to perform the action. Connect with any of this roles: [${roles.join(
        ', '
      )}]`
    );
    this.httpResponseCode = 401;
    this.name = ErrorType.UNAUTHORIZED;
  }
}

export class ParameterExceptionPluginError extends PluginError {
  constructor(param: string, value: unknown, validValues: string[], optional: boolean) {
    const parsedValue = typeof value === 'string' ? value : JSON.stringify(value);
    super(
      `Value '${parsedValue}' not supported for parameter ${param}. Pass any of [${validValues.join(
        ', '
      )}]${optional ? ' or remove it' : ''}.`
    );
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PARAMETER;
  }
}

export class UploadPluginError extends PluginError {
  constructor() {
    super('Upload a single file trough a form parameter named `plugin`.');
    this.httpResponseCode = 400;
    this.name = ErrorType.UPLOAD_FAILED;
  }
}

export class UploadSizePluginError extends PluginError {
  constructor() {
    super('File too big for the upload, increase the `maxUploadSizeMb` configuration.');
    this.httpResponseCode = 400;
    this.name = ErrorType.UPLOAD_FAILED;
  }
}

export class PluginNotFoundPluginError extends PluginError {
  constructor(pluginName: string) {
    super(
      `The plugin '${pluginName}' does not exists among the available plugins in this distribution.`
    );
    this.httpResponseCode = 404;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class PathNotFoundPluginError extends PluginError {
  constructor(path: string) {
    super(`The path '${path}' does not exists, check the spell.`);
    this.httpResponseCode = 404;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class InvalidObjectPluginError extends PluginError {
  constructor(path: string) {
    super(`The path '${path}' points to an invalid object, specify the path to a plugin file.`);
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PARAMETER;
  }
}

export class InvalidSourcePluginError extends PluginError {
  constructor() {
    super('Invalid input for the plugin parser.');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class ManifestNotFoundPluginError extends PluginError {
  constructor() {
    super('The file is not a valid plugin format: `manifest.json` not found.');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class MultipleManifestsFoundPluginError extends PluginError {
  constructor() {
    super('The file is not a valid plugin format: multiple `manifest.json` found.');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class MalformedManifestPluginError extends PluginError {
  constructor() {
    super('Error while parsing the `manifest.json` file, specify a valid JSON object.');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_PLUGIN;
  }
}

export class InvalidSelfActionPluginError extends PluginError {
  constructor() {
    super('Impossible to operate on the Plugin itself, perform the action manually on the server.');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_ACTION;
  }
}

export class InvalidFileNamePluginError extends PluginError {
  constructor(fileName: string) {
    super(
      `The specified file name '${fileName}', is not valid. Use a valid file name without any foder path.`
    );
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_ACTION;
  }
}

export class AlreadyParsedPluginError extends PluginError {
  constructor() {
    super('Plugin already parsed, not possible to parse a second time');
    this.httpResponseCode = 400;
    this.name = ErrorType.INVALID_ACTION;
  }
}
