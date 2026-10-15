// Local proximity alerts (C17, TASK-87.1, M3).

/** Cleanup hook for the wipe, the off switch and a permission downgrade. Nothing is registered before TASK-87.1,
 * which adds `Location.stopGeofencingAsync('zivali-geofence')` here. */
export async function stopGeofencing(): Promise<void> {}
