import {spawn} from 'child_process';
import {errorMonitor} from 'events';
import {request} from 'http';
import {traceDeprecation} from 'process';

import {response} from 'express';

type LKEPLugin = {
  filename: string;
  name: string;
  version: string;
  basePath: string;
  state: string;
  error: string;
};

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTable(id: any): Promise<HTMLElement> {
  while (document.getElementById(id) == null) {
    await delay(100);
  }
  return document.getElementById(id) as HTMLElement;
}

async function getElement(id: any): Promise<HTMLElement> {
  while (document.querySelector(id) == null) {
    await delay(100);
  }
  return document.querySelector(id) as HTMLElement;
}

//Manage Plugins Tab
async function managePlugins() {
  try {
    const table = document.querySelector('#manageTable tbody')! as HTMLTableElement;
    const tbody = document.createElement('tbody');

    const requestEnabled = await fetch(`api/plugins?filter=enabled`);
    if (requestEnabled.status === 200) {
      let res = await requestEnabled.json();
      let plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: LKEPLugin = res[plugins[i]] as LKEPLugin;

        const tr = document.createElement('tr');
        tr.setAttribute('id', `manage-${plugins[i]}`);

        //package
        const pack = document.createElement('td');
        pack.setAttribute('data-plugin', plugins[i]);
        pack.innerText = plugins[i];
        tr.append(pack);

        //name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', plugins[i]);
        name.innerText = act.name;
        tr.append(name);

        //version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', plugins[i]);
        version.innerText = act.version;
        tr.append(version);

        //state
        const state = document.createElement('td');
        const enabled = document.createElement('span');
        enabled.classList.add('tag-active');
        enabled.setAttribute('data-plugin', plugins[i]);
        enabled.innerText = 'ENABLED';
        state.append(enabled);
        tr.append(state);

        //manage
        const manage = document.createElement('td');
        //--disable button
        const disable = document.createElement('button');
        disable.setAttribute('class', 'button hasNext');
        disable.setAttribute('data-plugin', plugins[i]);
        disable.addEventListener('click', () => changeState(disable.dataset.plugin as string));
        disable.innerText = 'Disable';
        manage.append(disable);
        //--remove button
        const remove = document.createElement('button');
        remove.setAttribute('class', 'button');
        remove.setAttribute('data-plugin', plugins[i]);
        remove.addEventListener('click', () => removePlugin(remove.dataset.plugin as string));
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
      let res = await requestDisabled.json();
      let plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: LKEPLugin = res[plugins[i]] as LKEPLugin;

        console.log(plugins[i]);

        const tr = document.createElement('tr');

        //package
        const pack = document.createElement('td');
        pack.setAttribute('data-plugin', plugins[i]);
        pack.innerText = plugins[i];
        tr.append(pack);

        //name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', plugins[i]);
        name.innerText = act.name;
        tr.append(name);

        //version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', plugins[i]);
        version.innerText = act.version;
        tr.append(version);

        //state
        const state = document.createElement('td');
        const disabled = document.createElement('span');
        disabled.classList.add('tag-disabled');
        disabled.setAttribute('data-plugin', plugins[i]);
        disabled.innerText = 'DISABLED';
        state.append(disabled);
        tr.append(state);

        //manage
        const manage = document.createElement('td');
        //--enable button
        const enable = document.createElement('button');
        enable.classList.add('button', 'hasNext');
        enable.setAttribute('data-plugin', plugins[i]);
        enable.addEventListener('click', () => changeState(enable.dataset.plugin as string));
        enable.innerText = 'Enable';
        manage.append(enable);
        //--remove button
        const remove = document.createElement('button');
        remove.classList.add('button');
        remove.setAttribute('data-plugin', plugins[i]);
        remove.addEventListener('click', () => removePlugin(plugins[i]));
        remove.innerText = 'Remove';
        manage.append(remove);
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

//Status Tab
async function status() {
  try {
    const request = await fetch(`../../api/admin/plugins`);
    if (request.status === 200) {
      const table = document.querySelector('#statusTable tbody')! as HTMLTableElement;
      const tbody = document.createElement('tbody');

      const res = await request.json();
      const plugins = Object.keys(res);

      for (let i = 0; i < plugins.length; i++) {
        const act: LKEPLugin = res[plugins[i]] as LKEPLugin;

        const tr = document.createElement('tr');

        //name
        const name = document.createElement('td');
        name.setAttribute('data-plugin', act.basePath);
        name.innerText = act.name;
        tr.append(name);

        //version
        const version = document.createElement('td');
        version.setAttribute('data-plugin', act.basePath);
        version.innerText = act.version;
        tr.append(version);

        //instance
        const instance = document.createElement('td');
        instance.setAttribute('data-plugin', act.basePath);
        instance.innerHTML = `<a href="../${act.basePath}" target="_blank">${act.basePath}</a>`;
        instance.setAttribute('href', 'www.google.com');

        tr.append(instance);

        //state
        const state = document.createElement('td');
        const span = document.createElement('span');
        span.innerText = act.state.toUpperCase();
        span.setAttribute('data-plugin', act.basePath);
        if (act.state === 'running') {
          span.classList.add('tag-active');
        } else {
          span.classList.add('tag-disabled');
        }
        state.append(span);
        tr.append(state);

        //logs
        const logs = document.createElement('td');
        const open = document.createElement('button');
        open.classList.add('button');
        open.setAttribute('data-plugin', act.basePath);
        open.innerText = 'Open';
        if (act.state != 'error-manifest') {
          open.addEventListener('click', () => window.open(`api/logs/${act.basePath}`, '_blank'));
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

//Backup tab
async function backup() {
  try {
    const request = await fetch(`api/plugins?filter=backup`);
    if (request.status === 204) {
    } else {
    }
    const table = document.querySelector('#backupTable tbody')! as HTMLTableElement;

    const tbody = document.createElement('tbody');

    const res = await request.json();
    const plugins = Object.keys(res);

    for (let i = 0; i < plugins.length; i++) {
      const act: LKEPLugin = res[plugins[i]] as LKEPLugin;

      const tr = document.createElement('tr');
      tr.setAttribute('id', `backup-${plugins[i]}`);

      //package
      const pack = document.createElement('td');
      pack.setAttribute('data-plugin', plugins[i]);
      pack.innerText = plugins[i];
      tr.append(pack);

      //Manage
      const manage = document.createElement('td');
      const restore = document.createElement('button');
      restore.setAttribute('class', 'button');
      restore.setAttribute('data-plugin', plugins[i]);
      restore.innerText = 'Restore';
      restore.addEventListener('click', () => restorePlugin(restore.dataset.plugin as string));
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
      //showErrorPopup(request.json().message)
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
    if (request.status != 204) {
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
  const tag = document.querySelector(`span[data-plugin="${plugin}"]`) as HTMLSpanElement;
  const button = document.querySelector(`button[data-plugin="${plugin}"]`) as HTMLButtonElement;
  try {
    if (tag.getAttribute('class') === 'tag-active') {
      let request = await fetch(`api/plugin/${plugin}/disable`, {method: 'PATCH'});
      console.log(request.status);
      if (request.status === 204) {
        tag.innerHTML = 'DISABLED';
        tag.setAttribute('class', 'tag-disabled');
        button.innerHTML = 'Enable';
      } else {
        const error: Error = (await request.json()) as Error;
        showErrorPopup(error.message);
      }
    } else {
      let request = await fetch(`api/plugin/${plugin}/enable`, {method: 'PATCH'});
      console.log(request.status);
      if (request.status === 204) {
        tag.innerHTML = 'ENABLED';
        tag.setAttribute('class', 'tag-active');
        button.innerHTML = 'Disable';
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

async function readFile() {
  let input = document.getElementById('importFile') as any;
  input = input.files[0];

  if (!input || !input.name.endsWith('.lke')) {
    const error = await getElement('#fileError');
    error.innerHTML = 'Select a valid file! ';
  } else {
    startWaiting();
    await delay(1000);
  }
  stopWaiting();
}

window.addEventListener('load', () => {
  fetch(`api/authorize`)
    .then((response) => {
      if (response.status === 204) {
        document.getElementById('addButton')!.onclick = toggleAddMenu;
        document.getElementById('closePopup')!.onclick = closeErrorPopup;
        document.getElementById('installButton')!.onclick = readFile;

        document.getElementById('tab-1')!.onclick = status;
        document.getElementById('tab-2')!.onclick = managePlugins;
        document.getElementById('tab-3')!.onclick = backup;

        status();
        // managePlugins();
        // backup();
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

      showErrorPopup(error.message);
    });
});
