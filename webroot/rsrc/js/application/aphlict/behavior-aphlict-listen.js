/**
 * @provides javelin-behavior-aphlict-listen
 * @requires javelin-behavior
 *           javelin-aphlict
 *           javelin-stratcom
 *           javelin-request
 *           javelin-uri
 *           javelin-dom
 *           javelin-json
 *           javelin-router
 *           javelin-util
 *           phabricator-notification
 */

JX.behavior('aphlict-listen', function(config) {
  var showing_reload = false;

  JX.Stratcom.listen('aphlict-receive-message', null, function(e) {
    var message = e.getData();

    if (message.type != 'notification') {
      return;
    }

    var request = new JX.Request(
      '/notification/individual/',
      onNotification);

    var routable = request
      .addData({key: message.key})
      .getRoutable();

    routable
      .setType('notification')
      .setPriority(250);

    JX.Router.getInstance().queue(routable);
  });

  // Respond to a notification from the Aphlict notification server. We send
  // a request to Phabricator to get notification details.
  function onAphlictMessage(message) {
    JX.Stratcom.invoke('aphlict-receive-message', null, message);
  }

  // Respond to a response from Phabricator about a specific notification.
  function onNotification(response) {
    if (!response.pertinent) {
      return;
    }

    JX.Stratcom.invoke('notification-panel-update', null, {});

    // Show the notification itself.
    new JX.Notification()
      .setContent(JX.$H(response.content))
      .show();

    // If the notification affected an object on this page, show a
    // permanent reload notification if we aren't already.
    if ((response.primaryObjectPHID in config.pageObjects) && !showing_reload) {
      var reload = new JX.Notification()
        .setContent('Page updated, click to reload.')
        .alterClassName('jx-notification-alert', true)
        .setDuration(0);
      reload.listen('activate', function() { JX.$U().go(); });
      reload.show();

      showing_reload = true;
    }
  }

  var client = new JX.Aphlict(
    config.websocketURI,
    config.subscriptions);

  client
    .setHandler(onAphlictMessage)
    .start();

});
