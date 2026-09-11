export enum RoomMode {
  PRIVATE = 'Private',
  UPLOAD_ONLY = 'UploadOnly',
  SHARED = 'Shared',
  MODERATED = 'Moderated',
}

export const VALID_ROOM_MODES = Object.values(RoomMode);
