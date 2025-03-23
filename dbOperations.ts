import shortid from "shortid";
import redis from "./redis-client.js";

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
  Config,
} from "unique-names-generator";

const generateRandomName = (): string => {
  const config: Config = {
    dictionaries: [adjectives, colors, animals], // Combine 3 dictionaries
    separator: "-",
    length: 2, // Two-word combinations like 'frosty-waterfall'
    style: "lowerCase",
  };

  return uniqueNamesGenerator(config);
};

export async function createRoom() {
  const collabId = shortid();
  const now = Date.now();
  const name = generateRandomName();

  try {
    await redis.set(`collab:${collabId}`, name);

    await redis.zadd("active:rooms", now, collabId);
    console.log("create response", { success: true, collabId, name });

    return { success: true, collabId, name };
  } catch (err) {
    console.error("Error creating collab:", err);
    throw err;
  }
}

export async function joinRoom(
  collabId: string,
  userId: string,
  username: string
) {
  try {
    const collabName = await redis.get(`collab:${collabId}`);
    if (!collabName) {
      return { success: false, message: "Collab does not exist" };
    }
    const memberCount = await redis.scard(`collab:members:${collabId}`);
    const maxUsers = 5;
    console.log("members in ", collabId, " is", memberCount);

    if (memberCount >= maxUsers) {
      return { success: false, message: "Collab room is full" };
    }

    console.log("not full");
    await redis.sadd(`collab:members:${collabId}`, userId);

    await redis.set(
      `user:collabs:${userId}`,
      JSON.stringify({ collabId, username })
    );

    await redis.zadd("active:rooms", Date.now(), collabId);

    return { success: true, name: collabName };
  } catch (err) {
    console.error("Error joining room:", err);
    throw err;
  }
}

async function getRoomMembers(collabId: string) {
  try {
    return await redis.smembers(`collab:members:${collabId}`);
  } catch (err) {
    console.error("Error getting room members:", err);
    throw err;
  }
}

async function deleteRoom(collabId: string) {
  try {
    const members = await getRoomMembers(collabId);

    for (const userId of members) {
      await redis.del(`user:collabs:${userId}`);
    }

    await redis.del(`collab:${collabId}`);
    await redis.del(`collab:members:${collabId}`);

    await redis.zrem("active:rooms", collabId);

    console.log("deleted room", collabId);

    return true;
  } catch (err) {
    console.error("Error deleting room:", err);
    throw err;
  }
}

async function getUserDetails(userId: string) {
  try {
    const user = await redis.get(`user:collabs:${userId}`);

    if (!user) {
      throw new Error("Error getting user details");
    }

    const { collabId, username } = JSON.parse(user);

    return { collabId, username };
  } catch (err) {
    console.error("Error getting user details:", err);
    throw err;
  }
}

export async function leaveRoom(userId: string) {
  try {
    const { collabId, username } = await getUserDetails(userId);

    await redis.srem(`collab:members:${collabId}`, userId);

    await redis.del(`user:collabs:${userId}`);

    const memberCount = await redis.scard(`collab:members:${collabId}`);

    if (memberCount === 0) {
      await deleteRoom(collabId);
    }

    console.log("User", username, "left collab", collabId);

    return { success: true, collabId, collabExists: !!memberCount, username };
  } catch {
    return { success: false };
  }
}
