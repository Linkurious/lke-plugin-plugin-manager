import { Manifest, PluginConfig, PluginRouteOptions } from "../@types/plugin";
import { parseLinkuriousAPI } from "./shared";
import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import express from "express";
import fileUpload from "express-fileupload";
import { PluginParser } from "./PluginParser";
import { glob } from "glob";

const PLUGIN_FOLDER = path.join("..", "..", "plugins");
const DISABLED_PLUGIN_FOLDER = path.join(PLUGIN_FOLDER, "disabled");
const BACKUP_PLUGIN_FOLDER = path.join(PLUGIN_FOLDER, "old");
// const PLUGIN_SIZE_LIMIT = 200 * 1024 * 1024;

/**
 * Get the list of `*.lke` plugins (files or folders)
 *
 * @param folder: the folder in the FileSystem to scan
 * @returns a map of file names and their manifest
 */
async function getListOfPlugins(folder: string = PLUGIN_FOLDER): Promise<Record<string, Manifest>> {
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

export = async function configureRoutes(options: PluginRouteOptions<PluginConfig>): Promise<void> {

  const selfParser = new PluginParser(".");
  if (!await selfParser.parse()) {
    console.error("Failed to read manifest:", selfParser.errorMessage);
    process.exit(1);
  }

  options.router.use(express.json());
  options.router.use(fileUpload({ createParentPath: true, useTempFiles: false }));

  // Create local auxiliary folders
  if (!fs.existsSync(DISABLED_PLUGIN_FOLDER))
    fs.mkdirSync(DISABLED_PLUGIN_FOLDER);
  if (!fs.existsSync(BACKUP_PLUGIN_FOLDER))
    fs.mkdirSync(BACKUP_PLUGIN_FOLDER);

  options.router.use(asyncHandler(async (req, res, next) => {
    const restClient = options.getRestClient(req);
    try {
      /*
       * Check Securities or other custom code which should be executed for every call
       */
      await parseLinkuriousAPI(
        restClient.auth.getCurrentUser(),
        body => {
          if (!body.groups.find(g => g.name === "admin"))
            throw new Error("Unauthorized");
        }
      );
      next();
    }
    catch (e) {
      console.log(e);
      res.contentType("application/json");
      if (e instanceof Error)
        res.status(500).json({ "error": e.name, "message": e.message });
      else
        res.status(500).json(JSON.stringify(e));
    }
  }));

  /**
   * Get the manigest of this plugin
   */
  options.router.get("/manifest", (_req, res) => {
    res.json(selfParser.manifest);
  });


  /**
   * Upload a plugin (either for install or update)
   *
   * @param plugin: the file
   */
   options.router.post("/upload", asyncHandler(async (req, res) => {
    try {
      if (!req.files) {
        res.status(400).send({ message: "Upload a single `plugin` file please!" });
        return;
      }

      if (!req.files.plugin) {
        res.status(400).send({ message: "Upload a single `plugin` file please!" });
        return;
      }

      if (Array.isArray(req.files.plugin)) {
        res.status(400).send({ message: "Multi file upload is not supported!" });
        return;
      }

      const plugin = req.files.plugin;
      // if (path.extname(plugin.name) !== ".lke") {
      //   res.status(400).send({ message: "File not supported, upload a *.lke file!" });
      //   return;
      // }

      const pluginParser = new PluginParser(plugin.data);
      // const pluginStream = fs.createReadStream(plugin.tempFilePath);
      if (await pluginParser.parse()) {
        console.debug(pluginParser.manifest);
        console.debug(plugin.name, pluginParser.normalizedName);

        if (pluginParser.manifest!.name === selfParser.manifest!.name) {
          res.status(400).send({ message: "Impossible to operate on the Plugin Manager!" });
        }
        else {
          const destFolder = path.join(PLUGIN_FOLDER, pluginParser.normalizedName);
          if (fs.existsSync(destFolder))
            fs.renameSync(destFolder, path.join(BACKUP_PLUGIN_FOLDER, pluginParser.normalizedName));
          await plugin.mv(destFolder);
          res.status(200).send({ message: "Plugin updated successfully!", fileName: pluginParser.normalizedName });
        }
      }
      else {
        res.status(400).send({ message: pluginParser.errorMessage });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Get the list of the plugins files in a specific folder
   *
   * @param filter: null | "disabled" | "backedup"
   */
  options.router.get("/plugins", asyncHandler(async (req, res) => {
    try {
      const filter = typeof req.query.filter === "string" ? req.query.filter : "";
      switch (filter) {
        case "":
          res.json(await getListOfPlugins());
          break;
        case "disabled":
          res.json(await getListOfPlugins(DISABLED_PLUGIN_FOLDER));
          break;
        case "backedup":
          res.json(await getListOfPlugins(BACKUP_PLUGIN_FOLDER));
          break;
        default:
          res.status(400).send({ message: "Filter not valid!" });
          break;
      }
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Get the manifest of a specific plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.get("/plugin/:fileName", asyncHandler(async (req, res) => {
    try {
      const pluginPath = path.join(PLUGIN_FOLDER, req.params.fileName);
      if (fs.existsSync(pluginPath)) {
        const pluginParser = new PluginParser(pluginPath);
        if (await pluginParser.parse()) {
          res.json(pluginParser.manifest);
        }
        else {
          res.status(400).send({ message: "Plugin not valid!" });
        }
      }
      else
        res.status(400).send({ message: "Plugin not found!" });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Disable a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch("/plugin/:fileName/disable", asyncHandler(async (req, res) => {
    try {
      const srcFolder = path.join(PLUGIN_FOLDER, req.params.fileName);
      if (fs.existsSync(srcFolder)) {
        const pluginParser = new PluginParser(srcFolder);
        if (await pluginParser.parse()) {
          if (pluginParser.manifest!.name === selfParser.manifest!.name) {
            res.status(400).send({ message: "Impossible to operate on the Plugin Manager!" });
          }
          else {
            fs.renameSync(srcFolder, path.join(DISABLED_PLUGIN_FOLDER, req.params.fileName));
            res.status(200).send({ message: "Plugin moved to disabled folder!" });
          }
        }
        else
          res.status(400).send({ message: pluginParser.errorMessage });
      }
      else
        res.status(400).send({ message: "Plugin not found!" });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Re-enable a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch("/plugin/:fileName/enable", asyncHandler(async (req, res) => {
    try {
      const srcFolder = path.join(DISABLED_PLUGIN_FOLDER, req.params.fileName);
      if (fs.existsSync(srcFolder)) {
        const pluginParser = new PluginParser(srcFolder);
        if (await pluginParser.parse()) {
          if (pluginParser.manifest!.name === selfParser.manifest!.name) {
            res.status(400).send({ message: "Impossible to operate on the Plugin Manager!" });
          }
          else {
            fs.renameSync(srcFolder, path.join(PLUGIN_FOLDER, req.params.fileName));
            res.status(200).send({ message: "Plugin moved from disabled folder!" });
          }
        }
        else
          res.status(400).send({ message: pluginParser.errorMessage });
      }
      else
        res.status(400).send({ message: "Plugin not found!" });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Restore a backuped version of a plugin before it's installation
   *
   * @param fileName: the file name of the plugin
   */
  options.router.patch("/plugin/:fileName/restore", asyncHandler(async (req, res) => {
    try {
      const srcFolder = path.join(BACKUP_PLUGIN_FOLDER, req.params.fileName);
      if (fs.existsSync(srcFolder)) {
        const pluginParser = new PluginParser(srcFolder);
        if (await pluginParser.parse()) {
          if (pluginParser.manifest!.name === selfParser.manifest!.name) {
            res.status(400).send({ message: "Impossible to operate on the Plugin Manager!" });
          }
          else {
            fs.copyFileSync(srcFolder, path.join(PLUGIN_FOLDER, req.params.fileName));
            res.status(200).send({ message: "Plugin restored from backup folder!" });
          }
        }
        else
          res.status(400).send({ message: pluginParser.errorMessage });
      }
      else
        res.status(400).send({ message: "Plugin not found!" });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

  /**
   * Remove a plugin
   *
   * @param fileName: the file name of the plugin
   */
  options.router.delete("/plugin/:fileName", asyncHandler(async (req, res) => {
    try {
      const srcFolder = path.join(PLUGIN_FOLDER, req.params.fileName);
      if (fs.existsSync(srcFolder)) {
        const pluginParser = new PluginParser(srcFolder);
        if (await pluginParser.parse()) {
          if (pluginParser.manifest!.name === selfParser.manifest!.name) {
            res.status(400).send({ message: "Impossible to operate on the Plugin Manager!" });
          }
          else {
            fs.renameSync(srcFolder, path.join(BACKUP_PLUGIN_FOLDER, req.params.fileName));
            res.status(200).send({ message: "Plugin deleted!" });
          }
        }
        else
          res.status(400).send({ message: pluginParser.errorMessage });
      }
      else
        res.status(400).send({ message: "Plugin not found!" });
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  }));

};
