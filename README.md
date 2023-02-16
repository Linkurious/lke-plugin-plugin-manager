# Plugin Manager [plugin for Linkurious Enterprise](https://doc.linkurious.com/admin-manual/latest/plugins/)

This plugin allows to easily handle plugins in Linkurious Enterprise.

# Compatibility

This plugin is compatible with any version of Linkurious Enterprise however some features may be limited on versions older than v4.0.

# Configurations

This plugin supports the following custom configurations:

| Key | Type | Description | Example |
| :-- | :-- | :-- | :-- |
| `maxUploadSizeMb` | number (**optional**) | The maximum allowed size (in Megabytes) when uploading a plugin from the web interface. For security reasons, by defaults it is limited to 20MB. | `20` |

# URL Parameters

The plugin can be accessed from its home page without the need to specify any URL parameter.

# User Manual

The purpose of the plugin is to facilitate the management of individual Linkurious Enterprise plugins by allowing them to perform a set of actions: these actions will be explained more specifically in the next sections.

Access to the plugin is allowed only to users who are part of the `admin` group (please, refer to [this page](https://doc.linkurious.com/admin-manual/latest/access-control/) for more information on Linkurious Enterprise access control).

The plugin consists of 3 main tabs:

- **Status**
- **Manage Plugins**
- **Recycle Bin**

## Status tab

This is the tab listing all the currently deployed plugins in the Linkurious Enterprise instance.

![Status tab](/doc-assets/status.png)

The following information is available for each deployed plugin:

- **Plugin Name**: the name of the plugin as defined by developers;
- **Version**: the version of the plugin;
- **Plugin Instance**: the endpoint to which the plugin is available; clicking on it provides quick access to the plugin
- **State**: a tag describing the current state of the plugin; in case of errors in plugin execution, hovering the tag will display the extended error message (if any);
- **Logs**: a button to provide quick access to the plugin logs in a new browser tab.

> **NOTE**: the same plugin (identifiable by the **Plugin Name**) can be deployed multiple times: each deployment must have a different **Plugin Instance**. For all information, please refer to [this page](https://doc.linkurious.com/admin-manual/latest/plugins/) of the Linkurious Enterprise documentation

A `RESTART` button is also present in this tab. By clicking on it, all the plugins (including the Plugin Manager itself) will be restarted. As a result, plugins will be temporarily unavailable: please, do not refresh the page during the plugins restart operation.
## Manage Plugins tab

This is the tab listing all the available plugins in the Linkurious Enterprise instance.

![Manage Plugins tab](/doc-assets/manage-plugins.png)

The following information is available for each available plugin:

- **Package**: the name of the plugin archive;
- **Plugin Name**: the name of the plugin as defined by developers;
- **Version**: the version of the plugin;
- **Plugin Instance**: the endpoint to which the plugin is available; clicking on it provides quick access to the plugin
- **State**: a tag describing if the plugin is enabled or not;
- **Manage**: the managing panel for the plugin. For each available plugin (except for the Plugin Manager itself), an admin can:
  - **Enable**/**Disable** the plugin: the state of the plugin will be switched from `ENABLED` to `DISABLED` or vice-versa. A `DISABLED` plugin is not deployed at the next plugins restart;
  - **Remove** the plugin: the plugin will be removed from the available plugin and a copy of the package will be created in the **Recycle Bin** (see the next section for more details); it's not possible to remove a `DISABLED` plugin. A removed plugin is not deployed at the next plugins restart.

> **NOTE**: the same plugin (identifiable by the **Plugin Name**) can be deployed multiple times: each deployment must have a different **Plugin Instance**. For all information, please refer to [this page](https://doc.linkurious.com/admin-manual/latest/plugins/) of the Linkurious Enterprise documentation

A `RESTART` button is also present in this tab. By clicking on it, all the plugins (including the Plugin Manager itself) will be restarted. As a result, plugins will be temporarily unavailable: please, do not refresh the page during the plugins restart operation.

### Install a new plugin

In the same tab, admins can install new plugins: by clicking on the `ADD` button, the plugin installation form will be displayed. 

![Install a plugin](/doc-assets/add-plugin.png)

Here, admins can:
- select one of the Linkurious Enterprise official plugins;
- upload a valid plugin package;

By clicking on the `Install` button, the selected plugin will be installed and set as `ENABLED`.

> **NOTE**: after installing a new plugin, you need to click the `RESTART` button to deploy it.

## Recycle Bin tab

This is the tab listing all the removed plugins in the Linkurious Enterprise instance.

![Recycle Bin tab](/doc-assets/recycle-bin.png)

Plugins can be removed manually by an admin (by clicking its `Remove` button in the **Manage Plugins** tab) or automatically by the Plugin Manager (in case a plugin with the same name as another `ENABLED` plugin is installed: the Plugin Manager will remove the currently `ENABLED` plugin and replace it with the newly installed)

The following information is available for each removed plugin:

- **Package**: the name of the plugin archive;
- **Plugin Name**: the name of the plugin as defined by developers;
- **Version**: the version of the plugin;
- **Manage**: the managing panel for the removed plugin. For each available plugin, an admin can restore a plugin by clicking on its `RESTORE` button: the plugin will be available in the **Manage Plugins** tab.

An `EMPTY BIN` button is also present in this tab. By clicking on it, all the removed plugins will be permanently deleted from the recycle bin.

# Custom APIs

The Plugin Manager also provides a set of custom APIs for managing plugins. 

As well as for use via the user interface, use of these APIs is restricted to users who are members of the `admin` group.

>**NOTE**: These API must use the Plugin Manager basePath as endpoint\
 (e.g. `https://127.0.0.1:3000/plugins/plugin-manager/api/plugins`) 


## Get Plugins

Get the list of plugins

Type: `GET`

```url
/api/plugins
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `filter` *optional* | string | Type of the plugin.<br>Allowed values: `available` , `deployed`, `enabled`, `disabled`, `recyclebin` |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Get Manifest

Get the manifest of a plugin

Type: `GET`

```url
/api/plugin/:fileName
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Install an official Plugin

Install a Linkurious Enterprise official plugin from the `available` folder of the software build

Type: `POST`

```url
/api/install-available/:pluginName
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `pluginName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Disable a Plugin

Disable a plugin

Type: `PATCH`

```url
/api/plugin/:fileName/disable
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Enable a Plugin

Enable a Plugin

Type: `PATCH`

```url
/api/plugin/:fileName/enable
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Restore a Plugin

Restore a plugin from the recycle bin

Type: `PATCH`

```url
/api/plugin/:fileName/restore
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Remove a Plugin

Remove an enabled plugin

Type: `DELETE`

```url
/api/plugin/:fileName
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

---
## Stream plugin logs

Stream the logs of a plugin instance

Type: `GET`

```url
/api/logs/:pluginInstance
```

### Parameters

| Field | Type | Description |
| --- | --- | --- |
| `pluginInstance`  | string | The instance name of the plugin |

### Success 200

| Field | Type | Description |
| --- | --- | --- |
| `results` |  |  |

# Limitations

* For safety reasons, this plugin does not allow to operate on itself to avoid compromising the availability of the plugin in case of errors with a newer version.
* This plugin allows to install the version of the official plugins shipped within Linkurious Enterprise package. To install a newer version, you should update your Linkurious Enterprise or manually upload the new file.

# Licensing

The `Plugin Manager` is licensed under the Apache License, Version 2.0. See [LICENSE](/LICENSE) for the full license text.
