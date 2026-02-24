(function() {
  import('/js/app/bootstrap.js')
    .then(function(mod) {
      if (mod && typeof mod.bootApp === 'function') {
        mod.bootApp();
        return;
      }
      throw new Error('bootApp export not found in /js/app/bootstrap.js');
    })
    .catch(function(err) {
      console.error('[main] Failed to initialize app bootstrap', err);
    });
}());
