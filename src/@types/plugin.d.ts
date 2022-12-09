import {Readable} from 'stream';

import {RestClient} from '@linkurious/rest-client';
import {Router, Request} from 'express';

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
  status: 'ok';
  attribute: string;
  attributeValue: unknown;
}
