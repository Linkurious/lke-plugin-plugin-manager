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

TODO

# Limitations

* For sefty reasons, this plugin does not allow to operate on itself to avoid compromising the availability of the plugin in case of errors with a newer version.
* This plugin allows to install the version of the official plugins shipped within Linkurious Enterprise package. To install a newer version, you should update your Linkurious Enterprise or manually upload the new file.

# Licensing

The `Plugin Manager` is licensed under the Apache License, Version 2.0. See [LICENSE](/LICENSE) for the full license text.
