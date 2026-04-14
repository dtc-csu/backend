const { StreamChat } = require('stream-chat');

const { config } = require('../../config/env');

let streamClient;

const ensureConfigured = () => {
  if (!config.stream.enabled) {
    const error = new Error('Stream Chat is disabled. Set STREAM_ENABLED=true to enable chat.');
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  if (!config.stream.apiKey || !config.stream.apiSecret) {
    const error = new Error('Stream Chat credentials are missing. Add STREAM_API_KEY and STREAM_API_SECRET.');
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }
};

const getClient = () => {
  ensureConfigured();

  if (!streamClient) {
    streamClient = StreamChat.getInstance(config.stream.apiKey, config.stream.apiSecret);
  }

  return streamClient;
};

const getStreamStatus = async () => {
  const startedAt = Date.now();

  try {
    const client = getClient();
    await client.queryUsers({}, { id: 1 }, { limit: 1 });

    return {
      ok: true,
      enabled: true,
      apiKey: config.stream.apiKey || null,
      chatType: config.stream.chatType,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      enabled: config.stream.enabled,
      apiKey: config.stream.apiKey || null,
      chatType: config.stream.chatType,
      error: error.message,
      latencyMs: Date.now() - startedAt,
    };
  }
};

const toStreamUser = (user) => ({
  id: `user-${user.userId}`,
  name: user.fullName,
  role: user.role,
});

const issueUserToken = async (user) => {
  const client = getClient();
  const streamUser = toStreamUser(user);

  await client.upsertUser(streamUser);

  return {
    apiKey: config.stream.apiKey,
    user: streamUser,
    token: client.createToken(streamUser.id),
  };
};

const findExistingChannel = async (channelId) => {
  const client = getClient();
  const channels = await client.queryChannels(
    {
      id: channelId,
      type: config.stream.chatType,
    },
    { last_message_at: -1 },
    { limit: 1 },
  );

  return channels[0] || null;
};

const createOrGetBookingChannel = async ({ booking, passenger, driver }) => {
  const client = getClient();
  const channelId = `booking-${booking.bookingid}`;

  await client.upsertUsers([toStreamUser(passenger), toStreamUser(driver)]);

  let channel = await findExistingChannel(channelId);

  if (!channel) {
    channel = client.channel(config.stream.chatType, channelId, {
      name: `Booking #${booking.bookingid}`,
      created_by_id: `user-${passenger.userId}`,
      members: [`user-${passenger.userId}`, `user-${driver.userId}`],
      bookingId: booking.bookingid,
      passengerId: booking.passengerid,
      driverId: booking.driverid,
    });

    await channel.create();
  }

  const state = await channel.query();

  return {
    channelId,
    channelType: config.stream.chatType,
    state,
  };
};

const getBookingChannel = async (bookingId) => {
  const channelId = `booking-${bookingId}`;
  const channel = await findExistingChannel(channelId);

  if (!channel) {
    const error = new Error('Booking chat channel not found. Create it first.');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  const state = await channel.query();

  return {
    channelId,
    channelType: config.stream.chatType,
    state,
  };
};

const createOrGetSupportChannel = async (user) => {
  const client = getClient();
  const streamUser = toStreamUser(user);
  const channelId = `support-user-${user.userId}`;

  await client.upsertUser(streamUser);

  let channel = await findExistingChannel(channelId);

  if (!channel) {
    channel = client.channel(config.stream.chatType, channelId, {
      name: `${user.fullName} Support`,
      created_by_id: streamUser.id,
      members: [streamUser.id],
      supportChannel: true,
      ownerUserId: user.userId,
      ownerRole: user.role,
    });

    await channel.create();
  }

  const state = await channel.query();

  return {
    channelId,
    channelType: config.stream.chatType,
    state,
  };
};

module.exports = {
  issueUserToken,
  createOrGetBookingChannel,
  getBookingChannel,
  createOrGetSupportChannel,
  getStreamStatus,
};