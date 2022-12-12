import fs = require('fs');
import path = require('path');

import {glob} from 'glob';
import fileUpload = require('express-fileupload');

import {Manifest, PluginSource, SuccessfulResponse} from '../@types/plugin';

import {PluginParser} from './PluginParser';
import {
  InvalidFileNamePluginError,
  InvalidSelfActionPluginError,
  UploadSizePluginError
} from './exceptions';

export const enum PluginDeploymentStatus {
  DEPLOYED,
  ENABLED,
  DISABLED,
  BACKUP
}

export class PluginManager {
  private readonly selfParser: PluginParser;

  constructor(pluginSource: PluginSource = '.') {
    this.selfParser = new PluginParser(pluginSource);
  }

  getPath(type: PluginDeploymentStatus): string {
    switch (type) {
      case PluginDeploymentStatus.DEPLOYED:
        console.debug('Deployed path:', path.resolve('..'));
        return path.join('..');
      case PluginDeploymentStatus.ENABLED:
        return path.join('..', '..', 'plugins');
      case PluginDeploymentStatus.DISABLED:
        return path.join(this.getPath(PluginDeploymentStatus.ENABLED), '.disabled');
      case PluginDeploymentStatus.BACKUP:
        return path.join(this.getPath(PluginDeploymentStatus.ENABLED), '.backup');
    }
  }

  async initialize(): Promise<void> {
    // Create local auxiliary folders
    if (!fs.existsSync(this.getPath(PluginDeploymentStatus.DISABLED))) {
      fs.mkdirSync(this.getPath(PluginDeploymentStatus.DISABLED));
    }
    if (!fs.existsSync(this.getPath(PluginDeploymentStatus.BACKUP))) {
      fs.mkdirSync(this.getPath(PluginDeploymentStatus.BACKUP));
    }

    if (!(await this.selfParser.parse())) {
      throw this.selfParser.error!;
    }
  }

  /**
   * Get the manigest of this plugin
   */
  getPluginManagerManifest(): Manifest | null {
    return this.selfParser.manifest;
  }

  /**
   * Get the list of `*.lke` plugins (files or folders)
   *
   * @param folder: the folder in the FileSystem to scan
   * @returns a map of file names and their manifest
   */
  async getListOfPlugins(
    folder: PluginDeploymentStatus = PluginDeploymentStatus.ENABLED
  ): Promise<Record<string, Manifest>> {
    const plugins = {} as Record<string, Manifest>;
    for (const plugin of glob.sync(
      path.join(this.getPath(folder), folder === PluginDeploymentStatus.DEPLOYED ? '*' : '*.lke')
    )) {
      const fileName = path.basename(plugin);
      const pluginParser = new PluginParser(plugin);
      if (await pluginParser.parse()) {
        plugins[fileName] = pluginParser.manifest!;
      } else {
        console.warn(`Found ${fileName} but it's not a valid plugin`);
      }
    }
    return plugins;
  }

  async uploadPlugin(plugin: fileUpload.UploadedFile): Promise<SuccessfulResponse> {
    if (plugin.truncated) {
      throw new UploadSizePluginError();
    }

    const pluginParser = new PluginParser(plugin.tempFilePath);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        const destFolder = path.join(
          this.getPath(PluginDeploymentStatus.ENABLED),
          pluginParser.normalizedName
        );
        if (fs.existsSync(destFolder)) {
          fs.renameSync(
            destFolder,
            path.join(this.getPath(PluginDeploymentStatus.BACKUP), pluginParser.normalizedName)
          );
        }
        await plugin.mv(destFolder);
        return {status: 'ok', attribute: 'fileName', attributeValue: pluginParser.normalizedName};
      }
    } else {
      throw pluginParser.error;
    }
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
   * @param fileName: the file name of the plugin, if null
   */
  async getPluginManifest(fileName: string): Promise<Manifest> {
    this.validateFileName(fileName);

    const pluginPath = path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName);
    const pluginParser = new PluginParser(pluginPath);
    if (await pluginParser.parse()) {
      return pluginParser.manifest!;
    } else {
      throw pluginParser.error;
    }
  }

  async disablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        fs.renameSync(
          srcFolder,
          path.join(this.getPath(PluginDeploymentStatus.DISABLED), fileName)
        );
        return;
      }
    } else {
      throw pluginParser.error;
    }
  }

  async enablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.DISABLED), fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        fs.renameSync(srcFolder, path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName));
        return;
      }
    } else {
      throw pluginParser.error;
    }
  }

  async restorePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.BACKUP), fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        fs.copyFileSync(
          srcFolder,
          path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName)
        );
        return;
      }
    } else {
      throw pluginParser.error;
    }
  }

  async deletePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.getPath(PluginDeploymentStatus.ENABLED), fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      } else {
        fs.renameSync(srcFolder, path.join(this.getPath(PluginDeploymentStatus.BACKUP), fileName));
        return;
      }
    } else {
      throw pluginParser.error;
    }
  }
}
