import { Manifest, PluginSource, SuccessfulResponse } from "../@types/plugin";

import fs from "fs";
import path from "path";
import glob from "glob";

import { PluginParser } from "./PluginParser";
import fileUpload from "express-fileupload";
import { InvalidFileNamePluginError, InvalidSelfActionPluginError, UploadSizePluginError } from "./exceptions";

export class PluginManager {

  private readonly selfParser: PluginParser;

  public readonly PLUGIN_FOLDER: string;
  public readonly DISABLED_PLUGIN_FOLDER: string;
  public readonly BACKUP_PLUGIN_FOLDER: string;

  constructor(pluginSource: PluginSource = ".") {
    this.PLUGIN_FOLDER = path.join("..", "..", "plugins");
    this.DISABLED_PLUGIN_FOLDER = path.join(this.PLUGIN_FOLDER, ".disabled");
    this.BACKUP_PLUGIN_FOLDER = path.join(this.PLUGIN_FOLDER, ".old");

    this.selfParser = new PluginParser(pluginSource);
  }

  async initialize() {
    // Create local auxiliary folders
    if (!fs.existsSync(this.DISABLED_PLUGIN_FOLDER))
      fs.mkdirSync(this.DISABLED_PLUGIN_FOLDER);
    if (!fs.existsSync(this.BACKUP_PLUGIN_FOLDER))
      fs.mkdirSync(this.BACKUP_PLUGIN_FOLDER);

    if (!await this.selfParser.parse())
      throw this.selfParser.error!;
  }

  /**
   * Get the manigest of this plugin
   */
  getPluginManagerManifest() {
    return this.selfParser.manifest;
  }

  /**
   * Get the list of `*.lke` plugins (files or folders)
   *
   * @param folder: the folder in the FileSystem to scan
   * @returns a map of file names and their manifest
   */
  async getListOfPlugins(folder: string = this.PLUGIN_FOLDER): Promise<Record<string, Manifest>> {
    const plugins = {} as Record<string, Manifest>;
    for (const plugin of glob.sync(path.join(folder, "*.lke"))) {
      const fileName = path.basename(plugin);
      const pluginParser = new PluginParser(plugin);
      if (await pluginParser.parse()) {
        plugins[fileName] = pluginParser.manifest!;
      }
      else
        console.warn(`Found ${fileName} but it's not a valid plugin`);
    }
    return plugins;
  }

  async uploadPlugin(plugin: fileUpload.UploadedFile): Promise<SuccessfulResponse> {
    if (plugin.truncated)
      throw new UploadSizePluginError();

    const pluginParser = new PluginParser(plugin.tempFilePath);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      }
      else {
        const destFolder = path.join(this.PLUGIN_FOLDER, pluginParser.normalizedName);
        if (fs.existsSync(destFolder))
          fs.renameSync(destFolder, path.join(this.BACKUP_PLUGIN_FOLDER, pluginParser.normalizedName));
        await plugin.mv(destFolder);
        return { status: "ok", attribute: "fileName", attributeValue: pluginParser.normalizedName };
      }
    }
    else {
      throw pluginParser.error;
    }
  }

  public validateFileName(fileName: string) {
    const parsedFileNamePath = path.parse(fileName);
    if (parsedFileNamePath.dir !== "")
      throw new InvalidFileNamePluginError(fileName);
  }

  /**
   * Get the manifest of a specific plugin
   *
   * @param fileName: the file name of the plugin, if null
   */
  async getPluginManifest(fileName: string): Promise<Manifest> {
    this.validateFileName(fileName);

    const pluginPath = path.join(this.PLUGIN_FOLDER, fileName);
    const pluginParser = new PluginParser(pluginPath);
    if (await pluginParser.parse()) {
      return pluginParser.manifest!;
    }
    else {
      throw pluginParser.error;
    }
  }

  async disablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.PLUGIN_FOLDER, fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      }
      else {
        fs.renameSync(srcFolder, path.join(this.DISABLED_PLUGIN_FOLDER, fileName));
        return;
      }
    }
    else
      throw pluginParser.error;
  }

  async enablePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.DISABLED_PLUGIN_FOLDER, fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      }
      else {
        fs.renameSync(srcFolder, path.join(this.PLUGIN_FOLDER, fileName));
        return;
      }
    }
    else
      throw pluginParser.error;
  }

  async restorePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.BACKUP_PLUGIN_FOLDER, fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      }
      else {
        fs.copyFileSync(srcFolder, path.join(this.PLUGIN_FOLDER, fileName));
        return;
      }
    }
    else
      throw pluginParser.error;
  }

  async deletePlugin(fileName: string): Promise<void> {
    this.validateFileName(fileName);

    const srcFolder = path.join(this.PLUGIN_FOLDER, fileName);
    const pluginParser = new PluginParser(srcFolder);
    if (await pluginParser.parse()) {
      if (pluginParser.manifest!.name === this.selfParser.manifest!.name) {
        throw new InvalidSelfActionPluginError();
      }
      else {
        fs.renameSync(srcFolder, path.join(this.BACKUP_PLUGIN_FOLDER, fileName));
        return;
      }
    }
    else
      throw pluginParser.error;
  }

}
