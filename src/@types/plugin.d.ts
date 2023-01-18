import {PluginConfig as PluginConfigBase} from '@linkurious/rest-client';

export interface PluginConfig extends PluginConfigBase {
  maxUploadSizeMb: number;
}
