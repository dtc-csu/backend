const { getDatabase, getMessaging } = require('../../config/firebase-admin');

const readSnapshotValue = async (path) => {
  const snapshot = await getDatabase().ref(path).get();
  return snapshot.exists() ? snapshot.val() : null;
};

const countTruthy = (collection, key) => {
  if (!collection || typeof collection !== 'object') {
    return 0;
  }

  return Object.values(collection).filter((entry) => entry && entry[key] === true).length;
};

const flattenTokens = (rawTokensByUserId, targetUserIds) => {
  const tokenEntries = [];

  for (const userId of targetUserIds) {
    const userTokens = rawTokensByUserId?.[String(userId)] || rawTokensByUserId?.[userId];

    if (!userTokens || typeof userTokens !== 'object') {
      continue;
    }

    for (const tokenRecord of Object.values(userTokens)) {
      if (tokenRecord && typeof tokenRecord.token === 'string' && tokenRecord.token) {
        tokenEntries.push({ userId, token: tokenRecord.token });
      }
    }
  }

  return tokenEntries;
};

const getConnectionSummary = async () => {
  const [passengers, drivers, admins, driverLocations, tokens] = await Promise.all([
    readSnapshotValue('presence/passenger'),
    readSnapshotValue('presence/driver'),
    readSnapshotValue('presence/admin'),
    readSnapshotValue('driver_locations'),
    readSnapshotValue('notification_tokens'),
  ]);

  const tokenUsers = tokens && typeof tokens === 'object' ? Object.keys(tokens).length : 0;
  const tokenDevices = tokens && typeof tokens === 'object'
    ? Object.values(tokens).reduce((total, userTokens) => {
        if (!userTokens || typeof userTokens !== 'object') {
          return total;
        }

        return total + Object.keys(userTokens).length;
      }, 0)
    : 0;

  return {
    presence: {
      passengersOnline: countTruthy(passengers, 'online'),
      driversOnline: countTruthy(drivers, 'online'),
      adminsOnline: countTruthy(admins, 'online'),
    },
    driverLocations: {
      active: countTruthy(driverLocations, 'active'),
      totalTracked: driverLocations && typeof driverLocations === 'object' ? Object.keys(driverLocations).length : 0,
    },
    notificationTokens: {
      usersWithTokens: tokenUsers,
      registeredDevices: tokenDevices,
    },
  };
};

const listConnections = async () => {
  const [passengers, drivers, admins, driverLocations] = await Promise.all([
    readSnapshotValue('presence/passenger'),
    readSnapshotValue('presence/driver'),
    readSnapshotValue('presence/admin'),
    readSnapshotValue('driver_locations'),
  ]);

  return {
    presence: {
      passenger: passengers || {},
      driver: drivers || {},
      admin: admins || {},
    },
    driverLocations: driverLocations || {},
  };
};

const sendToUsers = async ({ userIds, title, body, data = {} }) => {
  const rawTokensByUserId = await readSnapshotValue('notification_tokens');
  const tokenEntries = flattenTokens(rawTokensByUserId, userIds);

  if (tokenEntries.length === 0) {
    return {
      title,
      body,
      targetedUsers: userIds,
      tokenCount: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokensRemoved: 0,
      results: [],
    };
  }

  const tokens = tokenEntries.map((entry) => entry.token);
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });

  const invalidTokenCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ]);

  let invalidTokensRemoved = 0;
  const results = [];

  await Promise.all(
    response.responses.map(async (result, index) => {
      const tokenEntry = tokenEntries[index];
      const errorCode = result.error?.code || null;

      if (!result.success && errorCode && invalidTokenCodes.has(errorCode)) {
        const tokenKey = tokenEntry.token.replace(/[^A-Za-z0-9_-]/g, '_');
        await getDatabase().ref(`notification_tokens/${tokenEntry.userId}/${tokenKey}`).remove();
        invalidTokensRemoved += 1;
      }

      results.push({
        userId: tokenEntry.userId,
        success: result.success,
        messageId: result.messageId || null,
        errorCode,
        errorMessage: result.error?.message || null,
      });
    }),
  );

  console.log(
    `Notifications: sent push '${title}' to ${tokenEntries.length} device(s), success=${response.successCount}, failure=${response.failureCount}`,
  );

  // Persist notification records in RTDB under /notifications/{userId}
  try {
    const now = Date.now();
    const db = getDatabase();
    await Promise.all(tokenEntries.map(async (entry) => {
      const noteRef = db.ref(`notifications/${entry.userId}`).push();
      await noteRef.set({
        title,
        body,
        data: data || {},
        createdAt: now,
      });
    }));
  } catch (e) {
    console.warn('Notifications: failed to persist notifications to RTDB', e && e.message ? e.message : e);
  }

  return {
    title,
    body,
    targetedUsers: userIds,
    tokenCount: tokenEntries.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokensRemoved,
    results,
  };
};

const notifyUsersSafely = async (payload) => {
  try {
    return await sendToUsers(payload);
  } catch (error) {
    console.warn(`Notifications: skipped send because ${error.message}`);
    return null;
  }
};

module.exports = {
  getConnectionSummary,
  listConnections,
  sendToUsers,
  notifyUsersSafely,
};