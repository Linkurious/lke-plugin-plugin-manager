import express = require('express');
import {NextFunction, Request, Response} from 'express';
import fileUpload = require('express-fileupload');

import {PluginConfig, PluginRouteOptions} from '../@types/plugin';

import {loggerFormatter, parseLinkuriousAPI} from './shared';
import {PluginManager} from './PluginManager';
import {
  ParameterExceptionPluginError,
  PluginError,
  UnauthorizedPluginError,
  UploadSizePluginError
} from './exceptions';

/**
 * Validate the plugin configuration parameters and add eventual default values.
 * Terminate the plugin in case of errors.
 */
function validateParameters(config: Partial<PluginConfig>): void {
  if (config.maxUploadSizeMb === null || config.maxUploadSizeMb === undefined) {
    config.maxUploadSizeMb = 20;
  } else if (typeof config.maxUploadSizeMb !== 'number') {
    console.error('Invalid `maxUploadSizeMb` configuration parameter. It should be a number.');
    process.exit(1);
  }
}

export = async function configureRoutes(options: PluginRouteOptions<PluginConfig>): Promise<void> {
  console.log = loggerFormatter(console.log);
  console.warn = loggerFormatter(console.warn);
  console.info = loggerFormatter(console.info);
  console.error = loggerFormatter(console.error);
  console.debug = loggerFormatter(console.debug);

  validateParameters(options.configuration);
  const manager = new PluginManager();
  await manager.initialize();

  options.router.use(express.json());
  options.router.use(
    fileUpload({
      createParentPath: true,
      useTempFiles: true,
      limits: {fileSize: options.configuration.maxUploadSizeMb * 1024 * 1024}
    })
  );

  options.router.use(async (req, res, next) => {
    const restClient = options.getRestClient(req);
    try {
      /*
       * Check Securities or other custom code which should be executed for every call
       */
      await parseLinkuriousAPI(restClient.auth.getCurrentUser(), (body) => {
        if (!body.groups.find((g) => g.name === 'admin')) {
          throw new UnauthorizedPluginError(['admin']);
        }
      });
      next();
    } catch (e) {
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
    }
  });

  function handleRequest(
    fun: (req: Request, res: Response, next?: NextFunction) => Promise<unknown | void>
  ): (req: Request, res: Response) => void {
    return async (req, res) => {
      try {
        const resp = await fun(req, res);

        if (resp === null || resp === undefined) {
          res.sendStatus(204);
        } else {
          res.status(200).json(resp);
        }
      } catch (e) {
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
      }
    };
  }

  /**
   * Get the manigest of this plugin
   */
  options.router.get(
    '/manifest',
    handleRequest(async () => {
      return Promise.resolve(manager.getPluginManagerManifest());
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
        throw new UploadSizePluginError();
      }

      return await manager.uploadPlugin(req.files.plugin);
    })
  );

  /**
   * Get the list of the plugins files in a specific folder
   *
   * @param filter: null | "disabled" | "backedup"
   */
  options.router.get(
    '/plugins',
    handleRequest(async (req) => {
      const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
      switch (filter) {
        case '':
          return await manager.getListOfPlugins();
        case 'disabled':
          return await manager.getListOfPlugins(manager.DISABLED_PLUGIN_FOLDER);
        case 'backedup':
          return await manager.getListOfPlugins(manager.BACKUP_PLUGIN_FOLDER);
        default:
          throw new ParameterExceptionPluginError('filter', filter, ['disabled', 'backedup'], true);
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
      return await manager.getPluginManifest(req.params.fileName);
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
   * Restore a backuped version of a plugin before it's installation
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
};
