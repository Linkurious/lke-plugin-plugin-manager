import { RestClient } from "@linkurious/rest-client";
import { Router, Request } from "express";

interface PluginBaseConfig {
  // path without any /
  basePath: string;
  debugPort?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginConfig extends PluginBaseConfig {
  // Your custom configurations
}

export interface PluginRouteOptions<CustomPluginConfig extends PluginConfig> {
  router: Router;
  configuration: CustomPluginConfig;
  getRestClient: (req: Request) => RestClient;
}

export interface Manifest {
  name: string;
  version: string;
  pluginApiVersion?: string;
  linkuriousVersion?: string;
  publicRoute?: string;
  singlePageAppIndex?: string;
  backendFiles?: string[];
}
