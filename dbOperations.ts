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

export async function joinRoom(collabId: string, userId: string) {
  try {
    const collabName = await redis.get(`collab:${collabId}`);
    if (!collabName) {
        return {success: false, message: "Collab does not exist"};
    }
    const memberCount = await redis.scard(`collab:members:${collabId}`);
    const maxUsers = 5;
    
    if (memberCount >= maxUsers) {
        return {success: false, message: "Collab room is full"};
    }
    
    console.log("not full");
    await redis.sadd(`collab:members:${collabId}`, userId);

    await redis.sadd(`user:collabs:${userId}`, collabId);

    await redis.zadd("active:rooms", Date.now(), collabId);

    return {success: true, name: collabName};
  } catch (err) {
    console.error("Error joining room:", err);
    throw err;
  }
}
