import path = require('path');
import {Readable} from 'stream';

import fs = require('fs-extra');
import {glob} from 'glob';
import fileUpload = require('express-fileupload');

import {Manifest, PluginParser} from './PluginParser';
import {
  InvalidFileNamePluginError,
  InvalidSelfActionPluginError,
  PathNotFoundPluginError,
  PluginNotFoundPluginError
} from './exceptions';

export type PluginSource = string | Readable | Buffer;

export const enum PluginDeploymentStatus {
  AVAILABLE,
  DEPLOYED,
  ENABLED,
  DISABLED,
  RECYCLEBIN
}

export interface UploadSuccessfulResponse {
  status: 'ok';
  attribute: string;
  attributeValue: unknown;
}

export class PluginManager {
  private readonly lkeRoot: string | undefined;
  private readonly selfParser: PluginParser;

  public constructor(lkeRoot?: string, pluginSource: PluginSource = '.') {
    if (!lkeRoot) {
      lkeRoot = path.join('..', '..', '..');
    }
    // Try to discover the lkeRoot path based on relative paths
    // Windows: LKE doesn't work with shortcuts to data data folder
    // Linux: it may fail in case of multiple symbolic links in the path
    // Official Docker: it's the fallback path
    const pluginCacheRealpath = fs.realpathSync(path.resolve(path.join('..')));
    const lkeRootPaths = [
      path.resolve(lkeRoot), // default path
      '/opt/linkurious-linux', // Linux suggested installation path
      '/usr/src/linkurious' // Official Docker path
    ];
    for (const p of lkeRootPaths) {
      const testingPluginCache = path.join(p, 'data', '.pluginCache');
      if (fs.existsSync(testingPluginCache)) {
        const testingPluginCacheRealpath = fs.realpathSync(testingPluginCache);
        if (
          testingPluginCacheRealpath === pluginCacheRealpath &&
          // This is needed to cover the case of Official Docker image
          fs.existsSync(path.join(p, 'system'))
        ) {
          this.lkeRoot = p;
          break;
        }
      }
    }

    if (!this.lkeRoot) {
      console.warn('Root folder of Linkurious Enterprise not found.');
    } else {
      console.info('Identified Linkurious Enterprise system root:', this.lkeRoot);
    }

    this.selfParser = new PluginParser(pluginSource);
  }

  public getPath(type: PluginDeploymentStatus | 'logs'): string {
    switch (type) {
      case PluginDeploymentStatus.AVAILABLE:
        if (this.lkeRoot) {
          return path.join(this.lkeRoot, 'system', 'plugins-available');
        } else {
          throw new PathNotFoundPluginError(type.toString());
        }
      case PluginDeploymentStatus.DEPLOYED:
        if (this.lkeRoot) {
          return path.join(this.lkeRoot, 'data', '.pluginCache');
        } else {
          return path.join('..');
        }
      case PluginDeploymentStatus.ENABLED:
        if (this.lkeRoot) {
          return path.join(this.lkeRoot, 'data', 'plugins');
        } else {
          return path.join('..', '..', 'plugins');
        }
      case PluginDeploymentStatus.DISABLED:
        return path.join(this.getPath(PluginDeploymentStatus.ENABLED), '.disabled');
      case PluginDeploymentStatus.RECYCLEBIN:
        return path.join(this.getPath(PluginDeploymentStatus.ENABLED), '.recyclebin');
      case 'logs':
        if (this.lkeRoot) {
          return path.join(this.lkeRoot, 'data', 'logs', 'plugins');
        } else {
          return path.join('..', '..', 'logs', 'plugins');
        }
    }
  }

  public async initialize(): Promise<void> {
    // Create local auxiliary folders
    if (!fs.existsSync(this.getPath(PluginDeploymentStatus.DISABLED))) {
      fs.mkdirSync(this.getPath(PluginDeploymentStatus.DISABLED));
    }
    if (!fs.existsSync(this.getPath(PluginDeploymentStatus.RECYCLEBIN))) {
      fs.mkdirSync(this.getPath(PluginDeploymentStatus.RECYCLEBIN));
    }

    if (!(await this.selfParser.parse())) {
      throw this.selfParser.error!;
    }
  }

  /**
   * Get the manifest of this plugin
   */
  public getPluginManagerManifest(): Manifest | null {
    return this.selfParser.manifest;
  }

  /**
   * Get the list of `*.lke` plugins (files or folders)
   *
   * @param folder: the folder in the FileSystem to scan
   * @returns a map of file names and their manifest
   */
  public async getListOfPlugins(
    folder: PluginDeploymentStatus = PluginDeploymentStatus.ENABLED
  ): Promise<Record<string, Manifest>> {
    if (folder === PluginDeploymentStatus.AVAILABLE && !this.lkeRoot) {
      return {};
    }

    const plugins = {} as Record<string, Manifest>;
    for (const plugin of glob.sync(
      path.join(this.getPath(folder), folder === PluginDeploymentStatus.DEPLOYED ? '*' : '*.lke')
    )) {
      const fileName = path.basename(plugin);
      const pluginParser = new PluginParser(plugin);
      if (await pluginParser.parse()) {
        plugins[fileName] = pluginParser.manifest!;
      } else {
        console.warn(`Found ${fileName} but it's not a valid plugin:`, pluginParser.error);
      }
    }
    return plugins;
  }

  private async handlePlugin<SrcType extends PluginSource, DstType extends string | undefined, T>(
    src: SrcType,
    dest: DstType,
    handler: (pluginParser: PluginParser, src: SrcType, dest: DstType) => T | Promise<T>
  ): Promise<T> {
    const pluginParser = new PluginParser(src);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        return Promise.resolve(handler(pluginParser, src, dest));
      }
    } else {
      throw pluginParser.error;
    }
  }

  private async copyPluginOnFileSystem(src: string, dest: string, move: boolean) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, {recursive: true});
    }

    if (move) {
      fs.moveSync(src, dest);
    } else {
      fs.copySync(src, dest);
    }
  }

  private async installPlugin<SrcType extends PluginSource, InstallArgs extends unknown[]>(
    pluginSource: SrcType,
    installProcedure: (
      pluginSource: SrcType,
      destPath: string,
      ...args: InstallArgs
    ) => void | Promise<void>,
    ...args: InstallArgs
  ): Promise<UploadSuccessfulResponse> {
    return this.handlePlugin(pluginSource, undefined, async (pluginParser, pluginSource) => {
      const dest = path.join(
        this.getPath(PluginDeploymentStatus.ENABLED),
        pluginParser.normalizedName
      );
      if (fs.existsSync(dest)) {
        await this.copyPluginOnFileSystem(
          dest,
          path.join(this.getPath(PluginDeploymentStatus.RECYCLEBIN), pluginParser.normalizedName),
          true
        );
      }
      await installProcedure(pluginSource, dest, ...args);
      return {status: 'ok', attribute: 'fileName', attributeValue: pluginParser.normalizedName};
    });
  }

  public async uploadPlugin(plugin: fileUpload.UploadedFile): Promise<UploadSuccessfulResponse> {
    return await this.installPlugin(
      plugin.tempFilePath,
      (srcPath, destPath, plugin) => plugin.mv(destPath),
      plugin
    );
  }

  public async installAvailablePlugin(pluginName: string): Promise<UploadSuccessfulResponse> {
    if (!this.lkeRoot) {
      // Don't try to read in the fallback directory
      throw new PluginNotFoundPluginError(pluginName);
    }

    const pluginSrc = fs
      .readdirSync(this.getPath(PluginDeploymentStatus.AVAILABLE))
      .filter((f) => f.startsWith(`lke-plugin-${pluginName}`));
    if (pluginSrc.length !== 1) {
      throw new PluginNotFoundPluginError(pluginName);
    }
    const pluginPath = path.join(this.getPath(PluginDeploymentStatus.AVAILABLE), pluginSrc[0]);

    return await this.installPlugin(pluginPath, (srcPath, destPath) =>
      this.copyPluginOnFileSystem(srcPath, destPath, false)
    );
  }

  public validateFileName(fileName: string): void {
    const parsedFileNamePath = path.parse(fileName);
    if (parsedFileNamePath.dir !== '') {
      throw new InvalidFileNamePluginError(fileName);
    }
  }

  /**
   * Get the manifest of a specific plugin
   *
   * @param pluginSource: the plugin source
   */
  public async getPluginManifest(pluginSource: PluginSource, validate: boolean): Promise<Manifest> {
    if (validate && typeof pluginSource === 'string') {
      this.validateFileName(pluginSource);
      pluginSource = path.join(this.getPath(PluginDeploymentStatus.ENABLED), pluginSource);
    }

    const pluginParser = new PluginParser(pluginSource);
    if (await pluginParser.parse()) {
      return pluginParser.manifest!;
    } else {
      throw pluginParser.error;
    }
  }

  async disablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName);
    return this.handlePlugin(
      srcFolder,
      path.join(this.getPath(PluginDeploymentStatus.DISABLED), fileName),
      async (pluginParser, srcFolder, destFolder) =>
        this.copyPluginOnFileSystem(srcFolder, destFolder, true)
    );
  }

  public async enablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.DISABLED), fileName);
    return this.handlePlugin(
      srcFolder,
      path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName),
      async (pluginParser, srcFolder, destFolder) =>
        this.copyPluginOnFileSystem(srcFolder, destFolder, true)
    );
  }

  public async restorePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.RECYCLEBIN), fileName);
    return this.handlePlugin(
      srcFolder,
      path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName),
      async (pluginParser, srcFolder, destFolder) =>
        this.copyPluginOnFileSystem(srcFolder, destFolder, true)
    );
  }

  public async deletePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName);
    return this.handlePlugin(
      srcFolder,
      path.join(this.getPath(PluginDeploymentStatus.RECYCLEBIN), fileName),
      async (pluginParser, srcFolder, destFolder) =>
        this.copyPluginOnFileSystem(srcFolder, destFolder, true)
    );
  }

  public async purgeDirectory(
    type: PluginDeploymentStatus.DISABLED | PluginDeploymentStatus.RECYCLEBIN
  ): Promise<void> {
    for (const file of fs.readdirSync(this.getPath(type))) {
      fs.rmSync(path.join(this.getPath(type), file), {recursive: true});
    }
  }

  public getLogs(pluginInstance: string): Readable {
    const logFile = path.join(this.getPath('logs'), `${pluginInstance}.log`);
    if (!fs.existsSync(logFile)) {
      throw new PathNotFoundPluginError(logFile);
    }
    return fs.createReadStream(logFile, {autoClose: true});
  }
}
