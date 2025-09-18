import shortid from "shortid";
import { Collab } from "./models.js";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
  Config,
} from "unique-names-generator";
import redis from "./redis-client.js";

const generateRandomName = (): string => {
  const config: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    length: 2,
    style: "lowerCase",
  };
  return uniqueNamesGenerator(config);
};

export async function createCollab() {
  const collabId = shortid();
  const name = generateRandomName();
  try {
    await Collab.create({
      collabId,
      name,
      messages: [],
      members: [],
      typingUsers: [],
    });
    return { success: true, collabId, name };
  } catch (err) {
    console.error("Error creating collab:", err);
    throw err;
  }
}

export async function joinCollab(
  collabId: string,
  userId: string,
  username: string
) {
  try {
    const collab = await Collab.findOne({ collabId });
    if (!collab) {
      return { success: false, message: "Collab does not exist" };
    }
    if (collab.members.length >= 5) {
      return { success: false, message: "Collab is full" };
    }
    collab.members.push({ userId, username });
    await collab.save();
    return {
      success: true,
      name: collab.name,
      allMessages: collab.messages,
      members: collab.members.map((m) => m.username),
    };
  } catch (err) {
    return { success: false, message: `failed to join collab ${collabId}` };
  }
}

export async function addMessageToCollab(
  message: string,
  byUser: boolean,
  collabId: string,
  username?: string
) {
  try {
    const collab = await Collab.findOne({ collabId });
    if (!collab) {
      return { success: false, message: "Collab does not exist" };
    }
    collab.messages.push({ message, byUser, username });
    await collab.save();
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function addTypingUser(username: string, collabId: string) {
  try {
    await redis.sadd(`collab:typing:${collabId}`, username);
    const users = await redis.smembers(`collab:typing:${collabId}`);
    return users;
  } catch (err) {
    console.error("error adding typing user", err);
    throw err;
  }
}

export async function removeTypingUser(username: string, collabId: string) {
  try {
    await redis.srem(`collab:typing:${collabId}`, username);
    const users = await redis.smembers(`collab:typing:${collabId}`);
    return users;
  } catch (err) {
    console.error("error removing typing user", err);
    throw err;
  }
}

export async function leaveCollab(userId: string) {
  try {
    const collab = await Collab.findOne({ "members.userId": userId });
    if (!collab) return { success: false };
    const member = collab.members.find((m) => m.userId === userId);
    collab.members = collab.members.filter((m) => m.userId !== userId);
    // Remove typing status from Redis
    if (member?.username) {
      await redis.srem(`collab:typing:${collab.collabId}`, member.username);
    }
    if (collab.members.length === 0) {
      await Collab.deleteOne({ collabId: collab.collabId });
      await redis.del(`collab:typing:${collab.collabId}`);
    } else {
      await collab.save();
    }
    return {
      success: true,
      collabId: collab.collabId,
      collabExists: collab.members.length > 0,
      username: member?.username,
    };
  } catch {
    return { success: false };
  }
}
