import fs from "fs";
import { glob } from "glob";
import tar from "tar";
import path from "path";
import { Duplex, Readable } from "stream";
import { pipeline } from "stream/promises";
import { Manifest } from "../@types/plugin";

/* eslint-disable no-underscore-dangle */
/**
 * Parser for Linkurious Enterprise plugins.
 * Starting from a path or a Readable Stream or a Buffer,
 * will detect and extract the manifest file.
 */
export class PluginParser {

  private _pluginSource: string | Readable | Buffer;
  private _parsed = false;
  private _sourceType: "file" | "folder" | null;
  private _numberOfManifestFiles: number;
  private _manifest: Manifest | null;
  private _errorMessage: string;

  public get status(): "initialized" | "parsed" | "error" { return !this._parsed ? "initialized" : this._errorMessage === "" ? "parsed" : "error"; }
  public get manifest(): Manifest | null { return this._manifest; }
  public get errorMessage(): string { return this._errorMessage; }
  public get normalizedName(): string { return this.status === "parsed" ? `${this._manifest!.name}-${this._manifest!.version}.lke` : ""; }

  constructor(pluginSource: string | Readable | Buffer) {
    this._parsed = false;
    this._sourceType = null;
    this._numberOfManifestFiles = 0;
    this._manifest = null;
    this._errorMessage = "";
    this._pluginSource = pluginSource;
  }

  /**
   * Start the analyzing process to indentify the manifest
   * @returns boolean indicating whether the parsing completed without errors
   */
  public async parse(): Promise<boolean> {
    try {
      if (this._parsed) {
        this._errorMessage = "Plugin already parsed!";
        return false;
      }

      let pluginStream: Readable | null;
      if (typeof this._pluginSource === "string") {
        if (!fs.existsSync(this._pluginSource)) {
          this._errorMessage = "Path doesn't exists!";
          return false;
        }

        // Use real path to handle eventual sym links
        const pathStats = fs.lstatSync(fs.realpathSync(this._pluginSource));
        if (pathStats.isFile()) {
          this._sourceType = "file";
          pluginStream = fs.createReadStream(this._pluginSource);
        }
        else if (pathStats.isDirectory()) {
          this._sourceType = "folder";
          pluginStream = null;
        }
        else {
          this._errorMessage = "Invalid object found at path!";
          return false;
        }
      }
      else if (this._pluginSource instanceof Buffer) {
        this._sourceType = "file";
        pluginStream = new Duplex();
        pluginStream.push(this._pluginSource);
        pluginStream.push(null);
      }
      else if (this._pluginSource instanceof Readable) {
        this._sourceType = "file";
        pluginStream = this._pluginSource;
      }
      else {
        this._errorMessage = "Invalid plugin source!";
        return false;
      }

      let manifestBufferPromise: Promise<Buffer> | undefined;

      if (this._sourceType === "file") {
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
        for (const fileName of glob.sync(path.join(this._pluginSource as string, "**/manifest.json"))) {
          if (this._numberOfManifestFiles === 0)
            manifestBufferPromise = Promise.resolve(fs.readFileSync(fileName));

          this._numberOfManifestFiles++;
        }
      }

      if (manifestBufferPromise === undefined) {
        this._errorMessage = "The file is not a valid plugin format: manifest.json not found!";
        return false;
      }

      // Avoid unhandled promises
      const manifestBuffer = await manifestBufferPromise;

      if (this._numberOfManifestFiles > 1) {
        this._errorMessage = "The file is not a valid plugin format: multiple manifest.json found!";
        return false;
      }

      try {
        this._manifest = JSON.parse(manifestBuffer.toString()) as Manifest;
      }
      catch (err) {
        console.error(err);
        this._manifest = null;
        this._errorMessage = "Error while parsing the manifest.json file!";
        return false;
      }

      return true;
    }
    catch (err) {
      console.error(err);
      this._errorMessage = "Unexpected error: " + JSON.stringify(err);
      return false;
    }
    finally {
      this._parsed = true;
    }
  }

}
