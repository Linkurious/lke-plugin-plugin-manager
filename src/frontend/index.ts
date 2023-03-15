import {InstalledPlugin} from '@linkurious/rest-client';

import {Manifest} from '../backend/PluginParser';

import {updateURLParameter} from './utils';

function startWaiting() {
  document.getElementById('spinner')?.classList.add('show');
}

function stopWaiting() {
  document.getElementById('spinner')?.classList.remove('show');
}

function showPopup(style: 'info' | 'error', message: string, blockApp = false) {
  const popup = document.getElementById('popup') as HTMLDivElement;
  const close = popup.querySelector('.close') as HTMLAnchorElement;
  const titleElement = popup.querySelector('.popupTitle') as HTMLHeadingElement;
  const messageElement = popup.querySelector('.popupMessage') as HTMLParagraphElement;

  titleElement.textContent = style === 'info' ? 'Information' : 'Error';
  messageElement.textContent = message;

  if (blockApp) {
    close.classList.add('.none');
    popup.classList.add('hider');
  } else {
    close.classList.remove('.none');
    popup.classList.remove('hider');
  }

  popup.classList.add('show');
}

function closePopup(this: HTMLDivElement) {
  this.closest('.popupContainer')?.classList.remove('show');
}

function toggleAddMenu() {
  const menu = document.getElementById('hiding-menu') as HTMLDivElement;
  menu.classList.toggle('show');
}

function createManagePluginsRow(
  pluginName: string,
  pluginManifest: Manifest,
  status: 'enabled' | 'disabled'
): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.setAttribute('data-plugin', pluginName);

  // package
  const pack = document.createElement('td');
  pack.textContent = pluginName;
  tr.append(pack);

  // name
  const name = document.createElement('td');
  name.textContent = pluginManifest.name;
  tr.append(name);

  // version
  const version = document.createElement('td');
  version.textContent = pluginManifest.version ?? null;
  tr.append(version);

  // state
  const state = document.createElement('td');
  const statusTag = document.createElement('span');
  statusTag.classList.add('state', status === 'enabled' ? 'tag-active' : 'tag-disabled');
  statusTag.textContent = status === 'enabled' ? 'ENABLED' : 'DISABLED';
  state.append(statusTag);
  tr.append(state);

  // manage
  const manage = document.createElement('td');
  // --action button (enable/disable)
  const actionButton = document.createElement('button');
  actionButton.classList.add('button', 'stateButton', 'hasNext');
  actionButton.addEventListener('click', () => void changeState(tr));
  actionButton.textContent = status === 'enabled' ? 'Disable' : 'Enable';
  manage.append(actionButton);
  // --remove button
  const remove = document.createElement('button');
  remove.classList.add('button', 'removeButton');
  remove.addEventListener('click', () => void removePlugin(tr));
  remove.textContent = 'Remove';
  // Disabled plugins cannot be removed, they need to be enabled first
  remove.disabled = status === 'disabled';
  manage.append(remove);
  tr.append(manage);

  if (pluginManifest.name === 'plugin-manager') {
    actionButton.disabled = true;
    remove.disabled = true;
  }

  return tr;
}

// Manage Plugins Tab
async function managePlugins() {
  try {
    const table = document.querySelector('#manageTable tbody')! as HTMLTableElement;
    const tbody = document.createElement('tbody');

    // Fill the tale with the list of enabled plugins
    const requestEnabled = await fetch(`api/plugins?filter=enabled`);
    if (requestEnabled.status === 200) {
      const plugins = (await requestEnabled.json()) as Record<string, Manifest>;
      for (const [pluginName, pluginManifest] of Object.entries(plugins)) {
        tbody.appendChild(createManagePluginsRow(pluginName, pluginManifest, 'enabled'));
      }
    } else {
      showPopup('error', await requestEnabled.text());
    }

    // Fill the tale with the list of disabled plugins
    const requestDisabled = await fetch(`api/plugins?filter=disabled`);
    if (requestDisabled.status === 200) {
      const plugins = (await requestDisabled.json()) as Record<string, Manifest>;
      for (const [pluginName, pluginManifest] of Object.entries(plugins)) {
        tbody.appendChild(createManagePluginsRow(pluginName, pluginManifest, 'disabled'));
      }
    } else {
      showPopup('error', await requestDisabled.text());
    }

    table.replaceWith(tbody);
  } catch (error) {
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

// Status Tab
async function pluginStatus() {
  try {
    const request = await fetch(`../../api/admin/plugins`);
    if (request.status === 200) {
      const table = document.querySelector('#statusTable tbody')! as HTMLTableElement;
      const tbody = document.createElement('tbody');

      const plugins = (await request.json()) as Record<string, InstalledPlugin>;
      for (const [, pluginManifest] of Object.entries(plugins)) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-plugin', pluginManifest.basePath || 'n/a');

        // name
        const name = document.createElement('td');
        name.textContent = pluginManifest.name;
        tr.append(name);

        // version
        const version = document.createElement('td');
        version.textContent = pluginManifest.version || 'n/a';
        tr.append(version);

        // instance
        const instance = document.createElement('td');
        if (pluginManifest.basePath === undefined) {
          instance.textContent = 'n/a';
        } else {
          instance.innerHTML = `<a href="../${pluginManifest.basePath}" target="_blank">${pluginManifest.basePath}</a>`;
        }
        tr.append(instance);

        // state
        const state = document.createElement('td');
        const span = document.createElement('span');
        span.textContent = pluginManifest.state.toUpperCase();
        if (pluginManifest.state === 'running') {
          span.classList.add('tag-active');
        } else {
          span.classList.add('tag-disabled');
          span.setAttribute('message', pluginManifest.error!);
          span.classList.add('tooltip');
        }
        state.append(span);
        tr.append(state);

        // logs
        const logs = document.createElement('td');
        const open = document.createElement('button');
        open.classList.add('button');
        open.textContent = 'Open';
        if (pluginManifest.state !== 'error-manifest') {
          open.addEventListener('click', () =>
            window.open(`api/logs/${pluginManifest.basePath!}`, '_blank')
          );
        } else {
          open.disabled = true;
        }
        logs.append(open);
        tr.append(logs);

        tbody.appendChild(tr);
      }

      table.replaceWith(tbody);
    } else {
      showPopup('error', await request.text());
    }
  } catch (error) {
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

// Recycle Bin tab
async function recyclebin() {
  try {
    const request = await fetch(`api/plugins?filter=recyclebin`);
    if (request.status === 200) {
      const table = document.querySelector('#recyclebinTable tbody')! as HTMLTableElement;
      const tbody = document.createElement('tbody');

      const plugins = (await request.json()) as Record<string, Manifest>;
      for (const [pluginName, pluginManifest] of Object.entries(plugins)) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-plugin', pluginName);

        // package
        const pack = document.createElement('td');
        pack.textContent = pluginName;
        tr.append(pack);

        // name
        const name = document.createElement('td');
        name.textContent = pluginManifest.name;
        tr.append(name);

        // version
        const version = document.createElement('td');
        version.textContent = pluginManifest.version ?? null;
        tr.append(version);

        // Manage
        const manage = document.createElement('td');
        const restore = document.createElement('button');
        restore.classList.add('button');
        restore.textContent = 'Restore';
        restore.addEventListener('click', () => void restorePlugin(tr));
        manage.append(restore);
        tr.append(manage);

        tbody.appendChild(tr);
      }

      table.replaceWith(tbody);
    } else {
      showPopup('error', await request.text());
    }
  } catch (error) {
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

async function removePlugin(row: HTMLTableRowElement) {
  startWaiting();
  try {
    const plugin = row.getAttribute('data-plugin')!;
    const request = await fetch(`api/plugin/${plugin}`, {method: 'DELETE'});
    if (request.status === 204) {
      row.remove();
      stopWaiting();
      showPopup('info', 'Plugin deleted, it is now in the Recycle Bin tab.');
    } else {
      stopWaiting();
      showPopup('error', await request.text());
    }
  } catch (error) {
    stopWaiting();
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

async function restorePlugin(row: HTMLTableRowElement) {
  startWaiting();
  try {
    const plugin = row.getAttribute('data-plugin')!;
    const request = await fetch(`api/plugin/${plugin}/restore`, {method: 'PATCH'});
    if (request.status === 204) {
      row.remove();
      stopWaiting();
      showPopup(
        'info',
        'Plugin restored successfully, it is now visible in the Manage Plugins tab.'
      );
    } else {
      showPopup('error', await request.text());
      stopWaiting();
    }
  } catch (error) {
    stopWaiting();
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

async function changeState(row: HTMLTableRowElement) {
  startWaiting();

  try {
    const plugin = row.getAttribute('data-plugin')!;
    const state = row.querySelector('.state') as HTMLSpanElement;
    const stateButton = row.querySelector('.stateButton') as HTMLButtonElement;
    const removeButton = row.querySelector('.removeButton') as HTMLButtonElement;
    if (state.classList.contains('tag-active')) {
      const request = await fetch(`api/plugin/${plugin}/disable`, {method: 'PATCH'});
      if (request.status === 204) {
        state.textContent = 'DISABLED';
        state.classList.toggle('tag-active');
        state.classList.toggle('tag-disabled');
        stateButton.textContent = 'Enable';
        removeButton.disabled = true;
        void managePlugins();
        showPopup('info', 'Plugin state changed correctly.');
      } else {
        showPopup('error', await request.text());
      }
    } else {
      const request = await fetch(`api/plugin/${plugin}/enable`, {method: 'PATCH'});
      if (request.status === 204) {
        state.textContent = 'ENABLED';
        state.classList.toggle('tag-active');
        state.classList.toggle('tag-disabled');
        stateButton.textContent = 'Disable';
        removeButton.disabled = false;
        void managePlugins();
        showPopup('info', 'Plugin state changed correctly.');
      } else {
        showPopup('error', await request.text());
      }
    }
  } catch (error) {
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  } finally {
    stopWaiting();
  }
}

async function purgePlugins() {
  if (
    confirm(
      'Do you want to permanently delete all the plugins in the recyle bin? The action is not reversible.'
    )
  ) {
    startWaiting();
    const request = await fetch('api/purge?filter=recyclebin', {method: 'DELETE'});
    if (request.status === 204) {
      await recyclebin();
    } else {
      showPopup('error', await request.text());
    }
    stopWaiting();
  }
}

async function restartPlugins() {
  startWaiting();
  const request = await fetch('../../api/admin/plugins/restart-all', {method: 'POST'});
  if (request.status === 204) {
    await pluginStatus();
  } else {
    showPopup('error', await request.text());
  }
  stopWaiting();
}

async function addPluginInit() {
  try {
    const request = await fetch(`api/plugins?filter=available`);
    const radioContainer = document.querySelector('#radioContainer')! as HTMLDivElement;

    // Create selection for built-in plugins
    const plugins = (await request.json()) as Record<string, Manifest>;
    for (const [, pluginManifest] of Object.entries(plugins)) {
      const officialPluginContainer = document.createElement('div');

      // radio
      const radio = document.createElement('input');
      radio.setAttribute('value', pluginManifest.name);
      radio.setAttribute('type', 'radio');
      radio.setAttribute('name', 'addPluginRadio');
      radio.setAttribute('id', `radio-${pluginManifest.name}`);
      if (pluginManifest.name === 'plugin-manager') {
        radio.disabled = true;
      }
      officialPluginContainer.appendChild(radio);

      // label
      const label = document.createElement('label');
      label.setAttribute('for', `radio-${pluginManifest.name}`);
      label.textContent = `Official plugin: ${pluginManifest.name} v${pluginManifest.version}`;
      officialPluginContainer.appendChild(label);

      radioContainer.appendChild(officialPluginContainer);
    }

    // Create selection for custom upload plugin
    const uploadedPluginContainer = document.createElement('div');
    const radio = document.createElement('input');
    // radio
    radio.setAttribute('value', 'upload');
    radio.setAttribute('type', 'radio');
    radio.setAttribute('name', 'addPluginRadio');
    radio.setAttribute('id', 'radio-upload');
    radio.checked = true;
    uploadedPluginContainer.appendChild(radio);

    // label
    const label = document.createElement('label');
    label.setAttribute('for', 'radio-upload');
    label.setAttribute('id', 'custom-plugin-manifest');
    label.innerHTML = 'Uploaded plugin: <span id="uploadedPlugin">n/a</span>';
    uploadedPluginContainer.appendChild(label);

    // file
    const file = document.createElement('input');
    file.setAttribute('accept', '.lke');
    file.setAttribute('type', 'file');
    file.setAttribute('id', 'importFile');
    file.setAttribute('name', 'importFile');
    file.addEventListener('change', () => void newPluginParsing());
    uploadedPluginContainer.appendChild(file);

    radioContainer.appendChild(uploadedPluginContainer);
  } catch (error) {
    showPopup('error', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

async function installPlugin() {
  startWaiting();
  const radio = document.querySelector('input[name="addPluginRadio"]:checked') as HTMLInputElement;

  if (radio.value !== 'upload') {
    const error = document.getElementById('fileError') as HTMLDivElement;
    error.textContent = '';
    const request = await fetch(`api/install-available/${radio.value}`, {method: 'POST'});
    if (request.status === 200) {
      await managePlugins();
      stopWaiting();
      showPopup('info', 'Official built-in plugin installed successfully.');
    } else {
      stopWaiting();
      showPopup('error', await request.text());
    }
  } else {
    const inputFile = document.getElementById('importFile') as HTMLInputElement;
    const error = document.getElementById('fileError') as HTMLDivElement;
    if (inputFile && inputFile.files && inputFile.files.length > 0) {
      // clear possible previous file errors
      error.textContent = '';
      const plugin = inputFile.files[0];
      const data = new FormData();
      data.append('plugin', plugin);

      const response = await fetch('api/upload', {
        method: 'POST',
        body: data
      });
      if (response.status === 200) {
        await managePlugins();
        showPopup('info', 'Uploaded plugin installed successfully.');
        stopWaiting();
      } else {
        showPopup('error', await response.text());
        stopWaiting();
      }
    } else {
      error.textContent = 'Select a valid file!';
      stopWaiting();
    }
  }
}

async function newPluginParsing() {
  startWaiting();

  const inputFile = document.getElementById('importFile') as HTMLInputElement;
  // Seletc this radio by default
  (document.getElementById('radio-upload') as HTMLInputElement).checked = true;

  if (inputFile && inputFile.files) {
    if (inputFile.files.length === 1) {
      const plugin = inputFile.files[0];
      const data = new FormData();
      data.append('plugin', plugin);

      const response = await fetch('api/manifest', {
        method: 'POST',
        body: data
      });
      if (response.status === 200) {
        const manifest = (await response.json()) as Manifest;
        document.getElementById(
          'uploadedPlugin'
        )!.textContent = `${manifest.name} v${manifest.version}`;
      } else {
        inputFile.value = '';
        showPopup('error', await response.text());
      }
    } else {
      document.getElementById('uploadedPlugin')!.textContent = 'n/a';
    }
  } else {
    const error = document.getElementById('fileError') as HTMLDivElement;
    error.textContent = 'Select a valid file!';
  }

  stopWaiting();
}

function init() {
  const urlParams = new URLSearchParams(location.search);

  startWaiting();
  fetch(`api/authorize`)
    .then(async (response) => {
      if (response.status === 204) {
        document.getElementById('addButton')!.onclick = toggleAddMenu;
        document.getElementById('installButton')!.onclick = installPlugin;
        document.getElementById('restartButton')!.onclick = restartPlugins;
        document.getElementById('restartButtonBis')!.onclick = restartPlugins;
        document.getElementById('purgeButton')!.onclick = purgePlugins;
        document
          .querySelectorAll('.popup .close')
          .forEach((p) => (<HTMLAnchorElement>p).addEventListener('click', closePopup));

        const tabHistory = (param: string) =>
          window.history.replaceState(
            '',
            '',
            updateURLParameter(window.location.href, 'tab', param)
          );

        document
          .getElementById('pluginStatus')!
          .addEventListener('click', () => tabHistory('pluginStatus'));
        document
          .getElementById('pluginStatus')!
          .addEventListener('click', () => void pluginStatus());
        document
          .getElementById('managePlugins')!
          .addEventListener('click', () => tabHistory('managePlugins'));
        document
          .getElementById('managePlugins')!
          .addEventListener('click', () => void managePlugins());
        document
          .getElementById('recyclebin')!
          .addEventListener('click', () => tabHistory('recyclebin'));
        document.getElementById('recyclebin')!.addEventListener('click', () => void recyclebin());

        await addPluginInit();
        (
          document.getElementById(urlParams.get('tab') || 'pluginStatus') ||
          document.getElementById('pluginStatus')!
        ).click();
      } else {
        showPopup(
          'error',
          "You don't have access to this plugin. Please contact your administrator.",
          true
        );
      }
    })
    .catch((error) => {
      showPopup('error', error instanceof Error ? error.message : JSON.stringify(error), true);
    })
    .finally(() => {
      stopWaiting();
    });
}

window.addEventListener('load', init);
