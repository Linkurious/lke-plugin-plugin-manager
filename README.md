<!-- omit in toc -->
# Plugin Manager [plugin for Linkurious Enterprise](https://doc.linkurious.com/admin-manual/latest/plugins/)

This plugin allows to easily handle plugins in Linkurious Enterprise.

<!-- auto generated with https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one -->
<!-- omit in toc -->
## Table of contents
- [Compatibility](#compatibility)
- [Configurations](#configurations)
- [URL Parameters](#url-parameters)
- [User Manual](#user-manual)
  - [Status tab](#status-tab)
  - [Manage Plugins tab](#manage-plugins-tab)
    - [Install a new plugin](#install-a-new-plugin)
  - [Recycle Bin tab](#recycle-bin-tab)
- [Custom APIs](#custom-apis)
  - [Get Plugins](#get-plugins)
  - [Get Manifest](#get-manifest)
  - [Install an official Plugin](#install-an-official-plugin)
  - [Upload a Plugin](#upload-a-plugin)
  - [Disable a Plugin](#disable-a-plugin)
  - [Enable a Plugin](#enable-a-plugin)
  - [Restore a Plugin](#restore-a-plugin)
  - [Remove a Plugin](#remove-a-plugin)
  - [Purge](#purge)
  - [Stream plugin logs](#stream-plugin-logs)
- [Limitations](#limitations)
- [Licensing](#licensing)

# Compatibility

This plugin is compatible with Linkurious Enterprise starting from v3.1. However, some features may be limited on versions older than v4.0.

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
- **Plugin Instance**: the endpoint to which the plugin is available; clicking on it provides quick access to the plugin;
- **State**: describes the current state of the plugin, in case of errors any additional information will be shown when hovering with the mouse;
- **Logs**: a button to provide quick access to the plugin logs in a new browser tab.

> **NOTE**: the same plugin (identifiable by the **Plugin Name**) can be deployed multiple times: each deployment will have a different **Plugin Instance** and the same version. It is not possible to have multiple versions of the same plugin running at the same time. For all information, please refer to [this page](https://doc.linkurious.com/admin-manual/latest/plugins/) of the Linkurious Enterprise documentation

A `RESTART` button is also present in this tab. By clicking on it, all the plugins (including the Plugin Manager itself) will be restarted. As a result, plugins will be temporarily unavailable: please, do not refresh the page during the plugins restart operation.
## Manage Plugins tab

This is the tab listing all the available plugins in the Linkurious Enterprise instance.

![Manage Plugins tab](/doc-assets/manage-plugins.png)

The following information is available for each available plugin:

- **Package**: the name of the plugin archive;
- **Plugin Name**: the name of the plugin as defined by developers;
- **Version**: the version of the plugin;
- **State**: describes if the plugin is enabled or not;
- **Manage**: the managing panel for the plugin. For each available plugin (except for the Plugin Manager itself), an admin can:
  - **Enable**/**Disable** the plugin: the state of the plugin will be switched from `ENABLED` to `DISABLED` or vice-versa. A `DISABLED` plugin is not deployed at the next plugins restart;
  - **Remove** the plugin: the plugin will be moved to the **Recycle Bin** and not deployed at the next plugins restart (see the next section for more details); it's not possible to remove a `DISABLED` plugin, you should activate it first.

A `RESTART` button is also present in this tab. By clicking on it, all the plugins (including the Plugin Manager itself) will be restarted. As a result, plugins will be temporarily unavailable: please, do not refresh the page during the plugins restart operation.

### Install a new plugin

In the same tab, admins can install new plugins: by clicking on the `ADD` button, the plugin installation form will be displayed. 

![Install a plugin](/doc-assets/add-plugin.png)

Here, admins can:
- select one of the Linkurious Enterprise official plugins;
- upload a valid plugin package: a standard naming convention will be used for the package; it includes the plugin name and its version as they are defined in the plugin manifest.

By clicking on the `Install` button, the selected plugin will be installed and set as `ENABLED`.

> **NOTE**: after installing a new plugin, you need to click the `RESTART` button to deploy it. Also, check on the plugin documentation for eventual mandatory (or optional) configurations required to correctly use the plugin.

## Recycle Bin tab

This is the tab listing all the removed plugins in the Linkurious Enterprise instance.

![Recycle Bin tab](/doc-assets/recycle-bin.png)

Plugins can be removed manually by an admin (by clicking its `Remove` button in the **Manage Plugins** tab) or automatically by the Plugin Manager (in case a plugin with the same name as another `ENABLED` plugin is installed: the Plugin Manager will remove the currently `ENABLED` plugin and replace it with the newly installed).

The following information is available for each removed plugin:

- **Package**: the name of the plugin archive;
- **Plugin Name**: the name of the plugin as defined by developers;
- **Version**: the version of the plugin;
- **Manage**: the managing panel for the removed plugin. For each available plugin, an admin can restore a plugin by clicking on its `RESTORE` button: the plugin will be available in the **Manage Plugins** tab.

An `EMPTY BIN` button is also present in this tab. By clicking on it, all the removed plugins will be permanently deleted from the recycle bin.

# Custom APIs

The Plugin Manager also provides a set of custom APIs for managing plugins. 

As well as for use via the user interface, use of these APIs is restricted to users who are members of the `admin` group.

>**NOTE**: These APIs must use the Plugin Manager basePath as endpoint\
 (e.g. `https://127.0.0.1:3000/plugins/plugin-manager/api/plugins`) 


## Get Plugins

Get the list of plugins

Type: `GET`

```url
/api/plugins
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `filter` *optional* | string | Type of the plugin.<br>Allowed values: `available` , `deployed`, `enabled` (*default*), `disabled`, `recyclebin` |

**Success 200**

| Field | Type | Description |
| --- | --- | --- |
| `results` | map | A map of plugins package names and their [manifest](https://docs.google.com/document/d/1rzs2mn757MGlLVYt7xfCkCwcIpwJ_57uvWK5pDSgEV4/edit#heading=h.iltjjscmj0ni "Plugins documentation: manifest file") |

---
## Get Manifest

Get the manifest of a plugin

Type: `GET`

```url
/api/plugin/:fileName
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin package |

**Success 200**

| Field | Type | Description |
| --- | --- | --- |
| `results` | json  | The [manifest](https://docs.google.com/document/d/1rzs2mn757MGlLVYt7xfCkCwcIpwJ_57uvWK5pDSgEV4/edit#heading=h.iltjjscmj0ni "Plugins documentation: manifest file") of the selected plugin |

---
## Install an official Plugin

Install a Linkurious Enterprise official plugin from the `available` folder of the software build

Type: `POST`

```url
/api/install-available/:pluginName
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `pluginName`  | string | The name of the plugin |

**Success 200**

| Field | Type | Description |
| --- | --- | --- |
| `fileName` | string | The package name generated by the plugin |

---
## Upload a Plugin

Upload and install a Linkurious Enterprise plugin

Type: `POST`

```url
/api/upload
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `plugin`  | file | The file (an archive) containing the plugin to be installed |

**Success 200**

| Field | Type | Description |
| --- | --- | --- |
| `fileName` | string | The package name generated by the plugin |

---
## Disable a Plugin

Disable a plugin

Type: `PATCH`

```url
/api/plugin/:fileName/disable
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin package |

**Success**

```java
HTTP/1.1 204 No Content
```

---
## Enable a Plugin

Enable a Plugin

Type: `PATCH`

```url
/api/plugin/:fileName/enable
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin package |

**Success**

```java
HTTP/1.1 204 No Content
```

---
## Restore a Plugin

Restore a plugin from the recycle bin

Type: `PATCH`

```url
/api/plugin/:fileName/restore
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin package |

**Success**

```java
HTTP/1.1 204 No Content
```

---
## Remove a Plugin

Remove an enabled plugin

Type: `DELETE`

```url
/api/plugin/:fileName
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `fileName`  | string | The name of the plugin package |

**Success**

```java
HTTP/1.1 204 No Content
```
---
## Purge

Purge a specific folder

Type: `DELETE`

```url
/api/purge
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `filter`  | string | The folder to purge.<br>Allowed values: `disabled`, `recyclebin` |

**Success**

```java
HTTP/1.1 204 No Content
```

---
## Stream plugin logs

Stream the logs of a plugin instance

Type: `GET`

```url
/api/logs/:pluginInstance
```

**Parameters**

| Field | Type | Description |
| --- | --- | --- |
| `pluginInstance`  | string | The instance name of the plugin |

**Success 200**

| Field | Type | Description |
| --- | --- | --- |
| `stream`  | string | A text stream with the latest logs of the plugin |

# Limitations

* For safety reasons, this plugin does not allow to operate on itself to avoid compromising the availability of the plugin in case of errors with a newer version.
* This plugin allows to install the version of the official plugins shipped within Linkurious Enterprise package. To install a newer version, you should update your Linkurious Enterprise or manually upload the new file.

# Licensing

The `Plugin Manager` is licensed under the Apache License, Version 2.0. See [LICENSE](/LICENSE) for the full license text.
