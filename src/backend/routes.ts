import express = require('express');
import {NextFunction, Request, Response} from 'express';
import fileUpload = require('express-fileupload');
import {PluginRouteOptions} from '@linkurious/rest-client';

import {PluginConfig} from '../@types/plugin';

import {loggerFormatter, parseLinkuriousAPI} from './shared';
import {PluginDeploymentStatus, PluginManager} from './PluginManager';
import {
  ParameterExceptionPluginError,
  PluginError,
  UnauthorizedPluginError,
  UploadPluginError,
  UploadSizePluginError
} from './exceptions';

/**
 * Validate the plugin configuration parameters and add eventual default values.
 * Terminate the plugin in case of errors.
 */
function validateParameters(config: Partial<PluginConfig>): void {
  if (config.maxUploadSizeMb === null || config.maxUploadSizeMb === undefined) {
    config.maxUploadSizeMb = 20;
  } else if (!isFinite(config.maxUploadSizeMb)) {
    console.error('Invalid `maxUploadSizeMb` configuration parameter. It should be a number.');
    process.exit(1);
  }
}

export = async function configureRoutes(
  // serverRootFolder: new parameter added later in LKE v3.1.x
  options: PluginRouteOptions<PluginConfig> & {serverRootFolder?: string}
): Promise<void> {
  console.log = loggerFormatter(console.log);
  console.warn = loggerFormatter(console.warn);
  console.info = loggerFormatter(console.info);
  console.error = loggerFormatter(console.error);
  console.debug = loggerFormatter(console.debug);

  validateParameters(options.configuration);
  const manager = new PluginManager(options.serverRootFolder);
  await manager.initialize();

  options.router.use(express.json());
  options.router.use(
    fileUpload({
      createParentPath: true,
      useTempFiles: true,
      limits: {fileSize: options.configuration.maxUploadSizeMb * 1024 * 1024}
    })
  );

  function respond(
    promiseFunction: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => Promise<void> | void
  ): express.RequestHandler {
    return (req, res, next) => {
      Promise.resolve(promiseFunction(req, res, next)).catch((e) => {
        let parsedError: PluginError;
        if (!(e instanceof PluginError)) {
          parsedError = PluginError.parseError(e);
          console.error(`${parsedError.name} - ${parsedError.message}. ${parsedError.stack || ''}`);
        } else {
          parsedError = e;
        }

        res
          .status(parsedError.getHttpResponseCode())
          .json({status: 'error', error: parsedError.name, message: parsedError.message});
      });
    };
  }

  const CUSTOM_RESPONSE = Symbol('customResponse');

  function handleRequest(
    fun: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>
  ): express.RequestHandler {
    return respond(async (req, res, next) => {
      const resp = await Promise.resolve(fun(req, res, next));
      if (resp === CUSTOM_RESPONSE) {
        /* The function handled the response itself */
      } else if (resp === null || resp === undefined) {
        res.sendStatus(204);
      } else {
        res.status(200).json(resp);
      }
    });
  }

  options.router.use(
    respond(async (req, res, next) => {
      const restClient = options.getRestClient(req);
      /*
       * Check Securities or other custom code which should be executed for every call
       */
      await parseLinkuriousAPI(restClient.auth.getCurrentUser(), (body) => {
        if (!body.groups.find((g) => g.name === 'admin')) {
          throw new UnauthorizedPluginError(['admin']);
        }
      });
      next();
    })
  );

  /**
   * Validate the user access rights
   */
  options.router.get(
    '/authorize',
    // It does anything because the whole logis in a middleware
    handleRequest(() => null)
  );

  /**
   * Get the manifest of this plugin
   */
  options.router.get(
    '/manifest',
    handleRequest(() => {
      return manager.getPluginManagerManifest();
    })
  );

  /**
   * Get the manifest of a specific plugin
   *
   * @param plugin: the file
   */
  options.router.post(
    '/manifest',
    handleRequest(async (req) => {
      if (!req.files || !req.files.plugin || Array.isArray(req.files.plugin)) {
        throw new UploadPluginError();
      }

      if (req.files.plugin.truncated) {
        throw new UploadSizePluginError();
      }

      return await manager.getPluginManifest(req.files.plugin.tempFilePath, false);
    })
  );

  /**
   * Upload a plugin (either for install or update)
   *
   * @param plugin: the file
   */
  options.router.post(
    '/upload',
    handleRequest(async (req) => {
      if (!req.files || !req.files.plugin || Array.isArray(req.files.plugin)) {
        throw new UploadPluginError();
      }

      if (req.files.plugin.truncated) {
        throw new UploadSizePluginError();
      }

      return await manager.uploadPlugin(req.files.plugin);
    })
  );

  /**
   * Install an official plugin from the `available` folder of the software build
   *
   * @param plugin: the file
   */
  options.router.post(
    '/install-available/:pluginName',
    handleRequest(async (req) => {
      return await manager.installAvailablePlugin(req.params.pluginName);
    })
  );

  /**
   * Get the list of the plugins files in a specific folder
   *
   * @param filter: null | "available" | "deployed" | "enabled" | "disabled" | "recyclebin"
   */
  options.router.get(
    '/plugins',
    handleRequest(async (req) => {
      switch (req.query.filter) {
        case 'available':
          return await manager.getListOfPlugins(PluginDeploymentStatus.AVAILABLE);
        case 'deployed':
          return await manager.getListOfPlugins(PluginDeploymentStatus.DEPLOYED);
        case undefined:
        case 'enabled':
          return await manager.getListOfPlugins(PluginDeploymentStatus.ENABLED);
        case 'disabled':
          return await manager.getListOfPlugins(PluginDeploymentStatus.DISABLED);
        case 'recyclebin':
          return await manager.getListOfPlugins(PluginDeploymentStatus.RECYCLEBIN);
        default:
          throw new ParameterExceptionPluginError(
            'filter',
            req.query.filter,
            ['available', 'deployed', 'enabled', 'disabled', 'recyclebin'],
            true
          );
      }
    })
  );

  /**
   * Get the manifest of a specific plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.get(
    '/plugin/:fileName',
    handleRequest(async (req) => {
      return await manager.getPluginManifest(req.params.fileName, true);
    })
  );

  /**
   * Disable a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch(
    '/plugin/:fileName/disable',
    handleRequest(async (req) => {
      return await manager.disablePlugin(req.params.fileName);
    })
  );

  /**
   * Re-enable a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch(
    '/plugin/:fileName/enable',
    handleRequest(async (req) => {
      return await manager.enablePlugin(req.params.fileName);
    })
  );

  /**
   * Restore a plugin from the recyclebin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch(
    '/plugin/:fileName/restore',
    handleRequest(async (req) => {
      return await manager.restorePlugin(req.params.fileName);
    })
  );

  /**
   * Remove a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.delete(
    '/plugin/:fileName',
    handleRequest(async (req) => {
      return await manager.deletePlugin(req.params.fileName);
    })
  );

  /**
   * Purge a specific folder
   *
   * @param filter: "disabled" | "recyclebin"
   */
  options.router.delete(
    '/purge',
    handleRequest(async (req) => {
      switch (req.query.filter) {
        case 'disabled':
          return await manager.purgeDirectory(PluginDeploymentStatus.DISABLED);
        case 'recyclebin':
          return await manager.purgeDirectory(PluginDeploymentStatus.RECYCLEBIN);
        default:
          throw new ParameterExceptionPluginError(
            'filter',
            req.query.filter,
            ['disabled', 'recyclebin'],
            true
          );
      }
    })
  );

  /**
   * Stream the logs of a particular plugin instance
   *
   * @param pluginInstance: the instance of the plugin
   */
  options.router.get(
    '/logs/:pluginInstance',
    handleRequest((req, res) => {
      manager.getLogs(req.params.pluginInstance).pipe(res);
      return CUSTOM_RESPONSE;
    })
  );
};
