import { PluginParser } from "./PluginParser";

export class PluginError extends Error {

  protected httpResponseCode: number;

  public getHttpResponseCode(): number {
    return this.httpResponseCode;
  }

  constructor(message?: string) {
    super(message || "An unknown issue happend on the system, contact the system administrator.");
    this.httpResponseCode = 500;
    this.name = "Unhandled Error";
  }

  static parseError(e: unknown): PluginError {
    let internalError: PluginError;
    if (e instanceof PluginError) {
      internalError = e;
    }
    else if (e instanceof Error) {
      internalError = new PluginError(`${e.name} - ${e.message}`);
      internalError.stack = e.stack;
    }
    else if ((<any>e).originalResponse?.body !== undefined) {
      // To intercept LKE API Errors
      console.error("Exception occurred in an API call:", (<any>e).originalResponse.body);
      internalError = new GenericPluginError("Exception occurred in an API call, check the logs for more details.");
    }
    else {
      // Generic parser
      internalError = new PluginError((<any>e)?.message?.toString() || JSON.stringify(e));
    }

    return internalError;
  }

}

export class GenericPluginError extends PluginError {
  constructor(message: string) {
    super(message);
    this.httpResponseCode = 500;
    this.name = "Generic Error";
  }
}

export class UnauthorizedPluginError extends PluginError {
  constructor(roles: string[]) {
    super(`The user has not the rights to perform the action. Connect with any of this roles: [${roles.join(", ")}]`);
    this.httpResponseCode = 401;
    this.name = "Unauthorized Error";
  }
}

export class ParameterExceptionPluginError extends PluginError {
  constructor(param: string, value: string, validValues: string[], optional: boolean) {
    super(`Value ${value} not supported for parameter ${param}. Pass any of [${validValues.join(", ")}]${optional ? " or remove it" : ""}.`);
    this.httpResponseCode = 400;
    this.name = "Invalid parameter";
  }
}

export class UploadPluginError extends PluginError {
  constructor() {
    super("Upload a single file trough a form parameter named `plugin`.");
    this.httpResponseCode = 400;
    this.name = "Upload failed";
  }
}

export class UploadSizePluginError extends PluginError {
  constructor() {
    super("File too big for the upload, increase the `maxUploadSizeMb` configuration.");
    this.httpResponseCode = 400;
    this.name = "Upload failed";
  }
}

export class InvalidManifestPluginError extends PluginError {
  constructor(pluginParser: PluginParser) {
    super(pluginParser.errorMessage);
    this.httpResponseCode = 400;
    this.name = "Plugin parsing failure";
  }
}

export class FileNotFoundPluginError extends PluginError {
  constructor(fileName: string) {
    super(`There is no file name '${fileName}', check the name spell.`);
    this.httpResponseCode = 400;
    this.name = "Plugin not found";
  }
}

export class InvalidSelfActionPluginError extends PluginError {
  constructor() {
    super("Impossible to operate on the Plugin itself, perform the action manually on the server.");
    this.httpResponseCode = 400;
    this.name = "Invalid action";
  }
}

export class InvalidFileNamePluginError extends PluginError {
  constructor(fileName: string) {
    super(`The specified file name '${fileName}', is not valid. Use a valid file name without any foder path.`);
    this.httpResponseCode = 400;
    this.name = "Invalid action";
  }
}
