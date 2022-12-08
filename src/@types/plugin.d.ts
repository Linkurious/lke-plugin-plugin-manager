import { RestClient } from "@linkurious/rest-client";
import { Router, Request } from "express";

interface PluginBaseConfig {
  // path without any /
  basePath: string;
  debugPort?: number;
}

export interface PluginConfig extends PluginBaseConfig {
  maxUploadSizeMb: number;
}

export interface PluginRouteOptions<CustomPluginConfig extends PluginConfig> {
  router: Router;
  configuration: CustomPluginConfig;
  getRestClient: (req: Request) => RestClient;
}

export type PluginSource = string | Readable | Buffer;

export interface Manifest {
  name: string;
  version: string;
  pluginApiVersion?: string;
  linkuriousVersion?: string;
  publicRoute?: string;
  singlePageAppIndex?: string;
  backendFiles?: string[];
}

export interface SuccessfulResponse {
  status: "ok";
  attribute: string;
  attributeValue: unknown;
}

export const enum ManifestParserErrorMessages {
  ALREADY_PARSED = "Plugin already parsed, not possible to parse a second time.",
  PATH_NOT_FOUND = "The path does not exists, specify a valid path.",
  INVALID_OBJECT = "Invalid object found at path, specify the path to a plugin file.",
  INVALID_PLUGIN_SOURCE = "Invalid input for the plugin parser.",
  MANIFEST_NOT_FOUND = "The file is not a valid plugin format: `manifest.json` not found.",
  MULTIPLE_MANIFESTS_FOUND = "The file is not a valid plugin format: multiple `manifest.json` found.",
  MALFORMED_MANIFESTS = "Error while parsing the `manifest.json` file, be sure it contains a valid JSON object."
}
