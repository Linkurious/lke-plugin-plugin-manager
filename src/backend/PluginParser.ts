import fs from "fs";
import { glob } from "glob";
import tar from "tar";
import path from "path";
import { Duplex, Readable } from "stream";
import { pipeline } from "stream/promises";
import { Manifest, PluginSource } from "../@types/plugin";
import { AlreadyParsedPluginError, InvalidObjectPluginError, InvalidSourcePluginError, MalformedManifestPluginError, ManifestNotFoundPluginError, MultipleManifestsFoundPluginError, PathNotFoundPluginError, PluginError } from "./exceptions";

/* eslint-disable no-underscore-dangle */
/**
 * Parser for Linkurious Enterprise plugins.
 * Starting from a path or a Readable Stream or a Buffer,
 * will detect and extract the manifest file.
 */
export class PluginParser {

  private _pluginSource: string | Readable | Buffer;
  private _parsed = false;
  private _numberOfManifestFiles: number;
  private _manifest: Manifest | null;
  private _error: PluginError | undefined;

  public get status(): "initialized" | "parsed" | "error" { return !this._parsed ? "initialized" : this._error === undefined ? "parsed" : "error"; }
  public get manifest(): Manifest | null { return this._manifest; }
  public get error(): PluginError | undefined { return this._error; }
  public get normalizedName(): string { return this.status === "parsed" ? `${!this._manifest!.name.startsWith("lke-plugin-") ? "lke-plugin-" : ""}${this._manifest!.name}-${this._manifest!.version}.lke` : ""; }

  constructor(pluginSource: PluginSource) {
    this._parsed = false;
    this._numberOfManifestFiles = 0;
    this._manifest = null;
    this._pluginSource = pluginSource;
  }

  /**
   * Get the stream from the source.
   *
   * @returns
   *  a Readable stream in case of a plugin file
   *  `null` in case of plugin folder
   *  `undefined` in case of an error
   */
  private getPluginStream(): Readable | undefined | null {
    let pluginStream: Readable;

    if (typeof this._pluginSource === "string") {
      if (!fs.existsSync(this._pluginSource)) {
        this._error = new PathNotFoundPluginError(this._pluginSource);
        return undefined;
      }

      // Use real path to handle eventual sym links
      const pathStats = fs.lstatSync(fs.realpathSync(this._pluginSource));
      if (pathStats.isFile()) {
        pluginStream = fs.createReadStream(this._pluginSource);
      }
      else if (pathStats.isDirectory()) {
        return null;
      }
      else {
        this._error = new InvalidObjectPluginError(this._pluginSource);
        return undefined;
      }
    }
    else if (this._pluginSource instanceof Buffer) {
      pluginStream = new Duplex();
      pluginStream.push(this._pluginSource);
      pluginStream.push(null);
    }
    else if (this._pluginSource instanceof Readable) {
      pluginStream = this._pluginSource;
    }
    else {
      this._error = new InvalidSourcePluginError();
      return undefined;
    }

    return pluginStream;
  }

  /**
   * Start the analyzing process to indentify the manifest
   * @returns boolean indicating whether the parsing completed without errors
   */
  public async parse(): Promise<boolean> {
    try {
      let manifestBufferPromise: Promise<Buffer> | undefined;

      if (this._parsed) {
        this._error = new AlreadyParsedPluginError();
        return false;
      }

      const pluginStream = this.getPluginStream();
      if (pluginStream === undefined) {
        // Plugin not found
        return false;
      }

      if (pluginStream) {
        // Plugin file
        await pipeline(
          pluginStream!,
          tar.t({
            filter: (p, _entry) => {
              const parsedPath = path.parse(p);

              if (parsedPath.base === "manifest.json" && parsedPath.dir.split(path.sep).length <= 1)
                return true;

              return false;
            }
          })
            .on("entry", (entry) => {
              if (this._numberOfManifestFiles === 0)
                manifestBufferPromise = entry.concat();
              this._numberOfManifestFiles++;
            })
        );
      }
      else {
        // Plugin folder
        for (const fileName of glob.sync(path.join(this._pluginSource as string, "**/manifest.json"))) {
          if (this._numberOfManifestFiles === 0)
            manifestBufferPromise = Promise.resolve(fs.readFileSync(fileName));

          this._numberOfManifestFiles++;
        }
      }

      if (manifestBufferPromise === undefined) {
        this._error = new ManifestNotFoundPluginError();
        return false;
      }

      // Avoid unhandled promises
      const manifestBuffer = await manifestBufferPromise;

      if (this._numberOfManifestFiles > 1) {
        this._error = new MultipleManifestsFoundPluginError();
        return false;
      }

      try {
        this._manifest = JSON.parse(manifestBuffer.toString()) as Manifest;
      }
      catch (err) {
        console.error(err);
        this._manifest = null;
        this._error = new MalformedManifestPluginError();
        return false;
      }

      return true;
    }
    catch (err) {
      console.error(err);
      this._error = PluginError.parseError(err);
      return false;
    }
    finally {
      this._parsed = true;
    }
  }

}
