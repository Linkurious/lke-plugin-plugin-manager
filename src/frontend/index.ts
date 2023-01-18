window.addEventListener('load', () => {
  document.getElementById('handle_plugin_clear_btn')!.onclick = () => {
    document.getElementById('plugin_handle_answer')!.firstChild!.textContent = '{}';
  };

  document.getElementById('handle_plugin_btn')!.onclick = () => {
    const name = (document.getElementById('plugin_name') as HTMLInputElement).value;
    const action = (
      document.querySelector("input[name='plugin_action']:checked") as HTMLInputElement
    ).value;

    const method = action === 'manifest' ? 'GET' : action === 'delete' ? 'DELETE' : 'PATCH';
    const urlAction = ['manifest', 'delete'].includes(action) ? '' : action;

    void fetch(`api/plugin/${encodeURIComponent(name)}/${urlAction}`, {method: method})
      .then((response) => {
        if (response.status === 204) {
          return {status: 'ok'};
        } else {
          return response.json();
        }
      })
      .then((data) => {
        document.getElementById('plugin_handle_answer')!.firstChild!.textContent = JSON.stringify(
          data,
          null,
          2
        );
      });
  };

  void fetch('api/manifest')
    .then((response) => response.json())
    .then((data) => {
      document.getElementById('plugin_manifest')!.firstChild!.textContent = JSON.stringify(
        data,
        null,
        2
      );
    });

  void fetch('api/plugins')
    .then((response) => response.json())
    .then((data) => {
      document.getElementById('active_plugins')!.firstChild!.textContent = JSON.stringify(
        data,
        null,
        2
      );
    });

  void fetch('api/plugins?filter=disabled')
    .then((response) => response.json())
    .then((data) => {
      document.getElementById('disabled_plugins')!.firstChild!.textContent = JSON.stringify(
        data,
        null,
        2
      );
    });

  void fetch('api/plugins?filter=backup')
    .then((response) => response.json())
    .then((data) => {
      document.getElementById('backup_plugins')!.firstChild!.textContent = JSON.stringify(
        data,
        null,
        2
      );
    });
});
