import {InstalledPlugin} from '@linkurious/rest-client';

import {Manifest} from '../backend/PluginParser';

function startWaiting() {
  document.getElementById('spinner')?.classList.add('show');
}
function stopWaiting() {
  document.getElementById('spinner')?.classList.remove('show');
}

function showErrorPopup(message: string) {
  const errorMessage = document.getElementById('errorMessage')! as HTMLParagraphElement;
  errorMessage.innerText = message;

  document.getElementById('errorPopup')?.classList.add('show');
}

function closeErrorPopup() {
  document.getElementById('errorPopup')?.classList.remove('show');
}

function toggleAddMenu() {
  const menu = document.getElementById('hiding-menu');
  menu?.classList.contains('show') ? menu?.classList.remove('show') : menu?.classList.add('show');
}

// Manage Plugins Tab
async function managePlugins() {
  try {
    const table = document.querySelector('#manageTable tbody')! as HTMLTableElement;
    const tbody = document.createElement('tbody');

    const requestEnabled = await fetch(`api/plugins?filter=enabled`);
    if (requestEnabled.status === 200) {
      let res = (await requestEnabled.json()) as Record<string, Manifest>;
      let plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: InstalledPlugin = res[plugins[i]] as InstalledPlugin;

        const tr = document.createElement('tr');
        tr.setAttribute('id', `manage-${plugins[i]}`);

        // package
        const pack = document.createElement('td');
        pack.setAttribute('data-plugin', plugins[i]);
        pack.innerText = plugins[i];
        tr.append(pack);

        // name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', plugins[i]);
        name.innerText = act.name;
        tr.append(name);

        // version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', plugins[i]);
        version.innerText = act.version as string;
        tr.append(version);

        // state
        const state = document.createElement('td');
        const enabled = document.createElement('span');
        enabled.classList.add('tag-active');
        enabled.setAttribute('id', `state-${plugins[i]}`);
        enabled.innerText = 'ENABLED';
        state.append(enabled);
        tr.append(state);

        // manage
        const manage = document.createElement('td');
        // --disable button
        const disable = document.createElement('button');
        disable.setAttribute('class', 'button hasNext');
        disable.setAttribute('id', `stateButton-${plugins[i]}`);
        disable.addEventListener('click', () => void changeState(plugins[i]));
        disable.innerText = 'Disable';
        manage.append(disable);
        // --remove button
        const remove = document.createElement('button');
        remove.setAttribute('class', 'button');
        remove.setAttribute('id', `removeButton-${plugins[i]}`);
        remove.addEventListener('click', () => void removePlugin(plugins[i]));
        remove.innerText = 'Remove';
        manage.append(remove);
        tr.append(manage);

        if (act.name === 'plugin-manager') {
          disable.disabled = true;
          disable.addEventListener('click', () => {});
          remove.disabled = true;
          remove.addEventListener('click', () => {});
        }

        tbody.appendChild(tr);
      }
    } else {
      const error: Error = (await requestEnabled.json()) as Error;
      showErrorPopup(error.message);
    }

    const requestDisabled = await fetch(`api/plugins?filter=disabled`);
    if (requestDisabled.status === 200) {
      let res = (await requestDisabled.json()) as Record<string, Manifest>;
      let plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: InstalledPlugin = res[plugins[i]] as InstalledPlugin;

        const tr = document.createElement('tr');

        // package
        const pack = document.createElement('td');
        pack.setAttribute('data-plugin', plugins[i]);
        pack.innerText = plugins[i];
        tr.append(pack);

        // name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', plugins[i]);
        name.innerText = act.name;
        tr.append(name);

        // version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', plugins[i]);
        version.innerText = act.version as string;
        tr.append(version);

        // state
        const state = document.createElement('td');
        const disabled = document.createElement('span');
        disabled.classList.add('tag-disabled');
        disabled.setAttribute('id', `state-${plugins[i]}`);
        disabled.innerText = 'DISABLED';
        state.append(disabled);
        tr.append(state);

        // manage
        const manage = document.createElement('td');
        // --enable button
        const enable = document.createElement('button');
        enable.classList.add('button', 'hasNext');
        enable.setAttribute('id', `stateButton-${plugins[i]}`);
        enable.addEventListener('click', () => void changeState(plugins[i]));
        enable.innerText = 'Enable';
        manage.append(enable);
        // --remove button
        const remove = document.createElement('button');
        remove.classList.add('button');
        remove.setAttribute('id', `removeButton-${plugins[i]}`);
        remove.addEventListener('click', () => void removePlugin(plugins[i]));
        remove.innerText = 'Remove';
        manage.append(remove);
        remove.disabled = true;
        tr.append(manage);

        tbody.appendChild(tr);
      }
    } else {
      const error: Error = (await requestDisabled.json()) as Error;
      showErrorPopup(error.message);
    }

    table.replaceWith(tbody);
  } catch (error) {
    showErrorPopup((error as Error).message as string);
  }
}

// Status Tab
async function pluginStatus() {
  try {
    const request = await fetch(`../../api/admin/plugins`);
    if (request.status === 200) {
      const table = document.querySelector('#statusTable tbody')! as HTMLTableElement;
      const tbody = document.createElement('tbody');

      const res = (await request.json()) as Record<string, InstalledPlugin>;
      const plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: InstalledPlugin = res[plugins[i]] as InstalledPlugin;

        const tr = document.createElement('tr');

        // name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', act.basePath as string);
        name.innerText = act.name;
        tr.append(name);

        // version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', act.basePath as string);
        version.innerText = act.version as string;
        tr.append(version);

        // instance
        const instance = document.createElement('td');
        instance.setAttribute('data-plugin', act.basePath as string);
        if (act.basePath === undefined) {
          instance.innerText = 'undefined';
        } else {
          instance.innerHTML = `<a href="../${act.basePath}" target="_blank">${act.basePath}</a>`;
        }

        tr.append(instance);

        // state
        const state = document.createElement('td');
        const span = document.createElement('span');
        span.innerText = act.state.toUpperCase();
        span.setAttribute('data-plugin', act.basePath as string);
        if (act.state === 'running') {
          span.classList.add('tag-active');
        } else {
          span.classList.add('tag-disabled');
          span.setAttribute('message', act.error as string);
          span.classList.add('tooltip');
        }
        state.append(span);
        tr.append(state);

        // logs
        const logs = document.createElement('td');
        const open = document.createElement('button');
        open.classList.add('button');
        open.setAttribute('data-plugin', act.basePath as string);
        open.innerText = 'Open';
        if (act.state !== 'error-manifest') {
          open.addEventListener('click', () =>
            window.open(`api/logs/${act.basePath as string}`, '_blank')
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
      const error: Error = (await request.json()) as Error;
      showErrorPopup(error.message);
    }
  } catch (error) {
    showErrorPopup((error as Error).message as string);
  }
}

// Backup tab
async function backup() {
  try {
    const request = await fetch(`api/plugins?filter=backup`);
    if (request.status === 204) {
      /* empty */
    } else {
      /* empty */
    }
    const table = document.querySelector('#backupTable tbody')! as HTMLTableElement;

    const tbody = document.createElement('tbody');

    const res = (await request.json()) as Record<string, Manifest>;
    const plugins = Object.keys(res);

    for (let i = 0; i < plugins.length; i++) {
      const tr = document.createElement('tr');
      tr.setAttribute('id', `backup-${plugins[i]}`);

      // package
      const pack = document.createElement('td');
      pack.setAttribute('data-plugin', plugins[i]);
      pack.innerText = plugins[i];
      tr.append(pack);

      // Manage
      const manage = document.createElement('td');
      const restore = document.createElement('button');
      restore.setAttribute('class', 'button');
      restore.setAttribute('data-plugin', plugins[i]);
      restore.innerText = 'Restore';
      restore.addEventListener('click', () => void restorePlugin(restore.dataset.plugin!));
      manage.append(restore);
      tr.append(manage);

      tbody.appendChild(tr);
    }

    table.replaceWith(tbody);
  } catch (error) {
    showErrorPopup(error as string);
  }
}

async function removePlugin(plugin: string) {
  startWaiting();
  try {
    const request = await fetch(`api/plugin/${plugin}`, {method: 'DELETE'});
    if (request.status === 204) {
      const elem = document.getElementById(`manage-${plugin}`) as HTMLTableRowElement;
      elem.parentNode?.removeChild(elem);
      stopWaiting();
    } else {
      // showErrorPopup(request.json().message)
    }
  } catch (error) {
    stopWaiting();
    showErrorPopup(error as string);
  }
}

async function restorePlugin(plugin: string) {
  startWaiting();
  try {
    const request = await fetch(`api/plugin/${plugin}/restore`, {method: 'PATCH'});
    if (request.status !== 204) {
      const error: Error = (await request.json()) as Error;
      showErrorPopup(error.message);
    }
    stopWaiting();
  } catch (error) {
    stopWaiting();
    showErrorPopup(error as string);
  }
}

async function changeState(plugin: string) {
  startWaiting();

  const state = document.getElementById(`state-${plugin}`) as HTMLSpanElement;
  const stateButton = document.getElementById(`stateButton-${plugin}`) as HTMLButtonElement;
  const removeButton = document.getElementById(`removeButton-${plugin}`) as HTMLButtonElement;
  try {
    if (state.getAttribute('class') === 'tag-active') {
      let request = await fetch(`api/plugin/${plugin}/disable`, {method: 'PATCH'});
      if (request.status === 204) {
        state.innerHTML = 'DISABLED';
        state.setAttribute('class', 'tag-disabled');
        stateButton.innerHTML = 'Enable';
        removeButton.disabled = true;
      } else {
        const error: Error = (await request.json()) as Error;
        showErrorPopup(error.message);
      }
    } else {
      let request = await fetch(`api/plugin/${plugin}/enable`, {method: 'PATCH'});
      if (request.status === 204) {
        state.innerHTML = 'ENABLED';
        state.setAttribute('class', 'tag-active');
        stateButton.innerHTML = 'Disable';
        removeButton.disabled = false;
      } else {
        const error: Error = (await request.json()) as Error;
        showErrorPopup(error.message);
      }
    }
    stopWaiting();
  } catch (error) {
    stopWaiting();
    showErrorPopup((error as Error).message as string);
  }
}

async function restartPLugins() {
  startWaiting();
  const request = await fetch('../../api/admin/plugins/restart-all', {method: 'POST'});
  if (request.status === 204) {
    await pluginStatus();
  } else {
    showErrorPopup(await request.text());
  }
  stopWaiting();
}

async function addPlugin() {
  try {
    const request = await fetch(`api/plugins?filter=available`);
    const container = document.querySelector('#radioContainer')! as HTMLFormElement;

    const res = (await request.json()) as Record<string, InstalledPlugin>;
    const plugins = Object.keys(res);

    for (let i = 0; i < plugins.length; i++) {
      const act: InstalledPlugin = res[plugins[i]] as InstalledPlugin;
      // radio
      const radio = document.createElement('input');
      radio.setAttribute('value', act.name);
      radio.setAttribute('type', 'radio');
      radio.setAttribute('name', 'addPluginRadio');
      radio.setAttribute('id', `radio-${act.name}`);
      if (act.name === 'plugin-manager') {
        radio.disabled = true;
      }
      // label
      const label = document.createElement('label');
      label.setAttribute('for', `radio-${act.name as string}`);
      label.innerText = `official plugin: ${act.name as string} v${act.version as string}`;

      container.appendChild(radio);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    }
    const radio = document.createElement('input');
    // radio
    radio.setAttribute('value', 'upload');
    radio.setAttribute('type', 'radio');
    radio.setAttribute('name', 'addPluginRadio');
    radio.setAttribute('id', 'radio-upload');

    radio.checked = true;
    // label
    const label = document.createElement('label');
    label.setAttribute('for', 'radio-upload');
    label.setAttribute('id', 'custom-plugin-manifest');
    label.innerHTML = 'upload a plugin: n/a';
    // file
    const file = document.createElement('input');
    file.setAttribute('type', 'file');
    file.setAttribute('id', 'importFile');
    file.setAttribute('name', 'importFile');
    file.onchange = newPluginParsing;

    container.appendChild(radio);
    container.appendChild(label);
    container.appendChild(file);
    container.appendChild(document.createElement('br'));
  } catch (error) {
    showErrorPopup(error as string);
  }
}

async function installPlugin() {
  startWaiting();
  const radio = document.getElementsByName('addPluginRadio') as NodeListOf<HTMLInputElement>;

  for (let i = 0; i < radio.length; i++) {
    if (radio[i].checked) {
      if (radio[i].value !== 'upload') {
        const error = document.getElementById('fileError') as HTMLDivElement;
        error.innerText = '';
        const request = await fetch(`api/install-available/${radio[i].value}`, {method: 'POST'});
        if (request.status === 200) {
          await managePlugins();
          stopWaiting();
        }
      } else {
        await readFile();
      }
    }
  }
}

async function readFile() {
  const inputFile = document.getElementById('importFile') as HTMLInputElement;
  const error = document.getElementById('fileError') as HTMLDivElement;

  if (inputFile && inputFile.files && inputFile.files.length > 0) {
    // clear possible previous file errors
    error.innerHTML = '';
    startWaiting();
    const plugin = inputFile.files[0];
    const data = new FormData();
    data.append('plugin', plugin);

    const response = await fetch('api/upload', {
      method: 'POST',
      body: data
    });
    if (response.status >= 200 && response.status < 300) {
      await managePlugins();
    } else {
      const close = document.getElementById('closePopup') as HTMLElement;
      close.parentElement?.removeChild(close);

      document.getElementById('errorPopup')?.classList.add('hider');

      showErrorPopup(JSON.stringify(response));
    }
  } else {
    error.innerText = 'Select a valid file!';
  }
  stopWaiting();
}

async function newPluginParsing() {
  const inputFile = document.getElementById('importFile') as HTMLInputElement;

  if (inputFile && inputFile.files) {
    startWaiting();
    if (inputFile.files.length === 1) {
      const plugin = inputFile.files[0];
      const data = new FormData();
      data.append('plugin', plugin);

      const response = await fetch('api/manifest', {
        method: 'POST',
        body: data
      });

      if (response.status >= 200 && response.status < 300) {
        const manifest = (await response.json()) as Manifest;
        document.getElementById(
          'custom-plugin-manifest'
        )!.innerText = `upload a plugin: ${manifest.name} v${manifest.version}`;
      } else {
        showErrorPopup(await response.text());
        inputFile.value = '';
      }
    } else {
      document.getElementById('custom-plugin-manifest')!.innerText = 'upload a plugin: n/a';
    }
  } else {
    const error = document.getElementById('fileError') as HTMLDivElement;
    error.innerHTML = 'Select a valid file! ';
  }
  stopWaiting();
}

function init() {
  fetch(`api/authorize`)
    .then(async (response) => {
      if (response.status === 204) {
        document.getElementById('addButton')!.onclick = toggleAddMenu;
        document.getElementById('closePopup')!.onclick = closeErrorPopup;
        document.getElementById('installButton')!.onclick = installPlugin;
        document.getElementById('restartButton')!.onclick = restartPLugins;

        document.getElementById('tab-1')!.onclick = pluginStatus;
        document.getElementById('tab-2')!.onclick = managePlugins;
        document.getElementById('tab-3')!.onclick = backup;

        await pluginStatus();
        await addPlugin();
      } else {
        const close = document.getElementById('closePopup') as HTMLElement;
        close.parentElement?.removeChild(close);

        document.getElementById('errorPopup')?.classList.add('hider');

        showErrorPopup("You don't have access to this plugin. Please contact your administrator");
      }
    })
    .catch((error) => {
      const close = document.getElementById('closePopup') as HTMLElement;
      close.parentElement?.removeChild(close);

      document.getElementById('errorPopup')?.classList.add('hider');

      showErrorPopup(error instanceof Error ? error.message : JSON.stringify(error));
    });
}

window.addEventListener('load', init);
