// App entry. The background tasks are defined before the router: a headless Android launch (a geofence event, the
// cache refresh) evaluates this file but never renders a route, so a task defined only in route imports is missing.
import './lib/offline/geofence';
import './lib/offline/sync';
import 'expo-router/entry';
