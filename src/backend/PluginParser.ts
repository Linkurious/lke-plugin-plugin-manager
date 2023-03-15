import fs = require('fs');
import path = require('path');
import {Duplex, Readable} from 'stream';
import {pipeline} from 'stream/promises';

import tar = require('tar');

import {
  AlreadyParsedPluginError,
  InvalidObjectPluginError,
  InvalidSourcePluginError,
  MalformedManifestPluginError,
  ManifestNotFoundPluginError,
  PathNotFoundPluginError,
  PluginError
} from './exceptions';
import {PluginSource} from './PluginManager';

export interface Manifest {
  name: string;
  version: string;
  pluginApiVersion?: string;
  linkuriousVersion?: string;
  publicRoute?: string;
  singlePageAppIndex?: string;
  backendFiles?: string[];
}

/**
 * Parser for Linkurious Enterprise plugins.
 * Starting from a path or a Readable Stream or a Buffer,
 * will detect and extract the manifest file.
 */
export class PluginParser {
  private _pluginSource: string | Readable | Buffer;
  private _parsed = false;
  private _manifest: Manifest | null;
  private _error: PluginError | undefined;

  public get status(): 'initialized' | 'parsed' | 'error' {
    return !this._parsed ? 'initialized' : this._error === undefined ? 'parsed' : 'error';
  }
  public get manifest(): Manifest | null {
    return this._manifest;
  }
  public get error(): PluginError | undefined {
    return this._error;
  }
  public get normalizedName(): string {
    return this.status === 'parsed'
      ? `${!this._manifest!.name.startsWith('lke-plugin-') ? 'lke-plugin-' : ''}${
          this._manifest!.name
        }-v${this._manifest!.version}.lke`
      : '';
  }

  constructor(pluginSource: PluginSource) {
    this._parsed = false;
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

    if (typeof this._pluginSource === 'string') {
      if (!fs.existsSync(this._pluginSource)) {
        this._error = new PathNotFoundPluginError(this._pluginSource);
        return undefined;
      }

      // Use real path to handle eventual sym links
      const pathStats = fs.lstatSync(fs.realpathSync(this._pluginSource));
      if (pathStats.isFile()) {
        pluginStream = fs.createReadStream(this._pluginSource);
      } else if (pathStats.isDirectory()) {
        return null;
      } else {
        this._error = new InvalidObjectPluginError(this._pluginSource);
        return undefined;
      }
    } else if (this._pluginSource instanceof Buffer) {
      pluginStream = new Duplex();
      pluginStream.push(this._pluginSource);
      pluginStream.push(null);
    } else if (this._pluginSource instanceof Readable) {
      pluginStream = this._pluginSource;
    } else {
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
      const manifestBufferPromise: Promise<{root: boolean; buffer: Buffer}>[] = [];

      if (this._parsed) {
        this._error = new AlreadyParsedPluginError();
        return false;
      }

      /*
        The stream can be either a folder or a stream from a *.lke plugin.
        The acceptable structures are:
        1. the plugin files (including the manifest.json) in the root
        2. (only for archives) the plugin files can be in a subfolder (e.g. `npm pack` creates `package`)
      */
      const pluginStream = this.getPluginStream();
      if (pluginStream === undefined) {
        // Plugin not found
        return false;
      }

      if (pluginStream !== null) {
        // Plugin file
        await pipeline(
          pluginStream!,
          tar
            .t({
              filter: (p) => {
                const parsedPath = path.parse(p);
                const pathDirs = parsedPath.dir.split(path.sep);

                if (pathDirs.length > 1) {
                  // Not looking in the sub directories
                  return false;
                }

                if (parsedPath.base === 'manifest.json') {
                  return true;
                }

                return false;
              }
            })
            .on('entry', (entry) => {
              const dir = path.dirname(entry.path);

              manifestBufferPromise.push(
                entry.concat().then((b: Buffer) => ({root: dir === '.', buffer: b}))
              );
            })
        );
      } else {
        // Plugin folder
        const basePath = this._pluginSource as string;
        for (const file of fs.readdirSync(basePath, {withFileTypes: true})) {
          if (file.name === 'manifest.json' && file.isFile()) {
            manifestBufferPromise.push(
              Promise.resolve({
                root: true,
                buffer: fs.readFileSync(path.join(basePath, file.name))
              })
            );
            break;
          }
        }
      }

      if (manifestBufferPromise.length === 0) {
        this._error = new ManifestNotFoundPluginError();
        return false;
      }

      // Avoid unhandled promises
      const manifestBuffer = await Promise.all(manifestBufferPromise);

      // Get the index from the root
      let manifestIndex = manifestBuffer.findIndex((e) => e.root);
      // If not found, get the last found index
      if (manifestIndex < 0) {
        manifestIndex = manifestBuffer.length - 1;
      }

      try {
        this._manifest = JSON.parse(manifestBuffer[manifestIndex].buffer.toString()) as Manifest;
      } catch (err) {
        console.error(err);
        this._manifest = null;
        this._error = new MalformedManifestPluginError();
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      this._error = PluginError.parseError(err);
      return false;
    } finally {
      this._parsed = true;
    }
  }
}
