import mongoose, { Schema, Document } from "mongoose";

export interface IMessage {
  message: string;
  byUser: boolean;
  username?: string;
}

export interface ICollab extends Document {
  collabId: string;
  name: string;
  messages: IMessage[];
  members: Array<{ userId: string; username: string }>;
}

const MessageSchema: Schema = new Schema({
  message: String,
  byUser: Boolean,
  username: String,
});

const CollabSchema: Schema = new Schema({
  collabId: { type: String, unique: true },
  name: String,
  messages: [MessageSchema],
  members: [
    {
      userId: String,
      username: String,
    },
  ],
});

export const Collab = mongoose.model<ICollab>("Collab", CollabSchema);
