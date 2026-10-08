/**
 * Channel manager / OTA integration contract.
 *
 * No OTA is connected yet. When one is (Booking.com, MakeMyTrip, Goibibo, Expedia
 * or a channel manager), implement a ChannelAdapter for it and receive its
 * webhooks in a server route under src/routes/api/public/channels/. Each external
 * reservation is stored once in `channel_reservations` (unique per channel +
 * external id) and imported as a normal row in `bookings`, so the same
 * availability check (rooms_free / bookings_compute) prevents overbooking across
 * every channel.
 */
export type ChannelId = "booking_com" | "makemytrip" | "goibibo" | "expedia" | "agoda" | "airbnb" | "channel_manager";

export type ExternalReservation = {
  channel: ChannelId;
  externalId: string;
  roomTypeCode: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guests: number;
  guestName: string;
  phone: string;
  email: string;
  status: "new" | "modified" | "cancelled";
  raw: unknown;
};

export type InventoryUpdate = { roomTypeId: string; date: string; available: number; rate: number };

export interface ChannelAdapter {
  id: ChannelId;
  /** Verify and parse an incoming webhook into reservations. Must reject unsigned calls. */
  parseWebhook(request: Request): Promise<ExternalReservation[]>;
  /** Map the channel's room code to our room_types.id. */
  mapRoomType(code: string): string | null;
  /** Push our availability/rates to the channel after any booking change. */
  pushInventory(updates: InventoryUpdate[]): Promise<void>;
}

/** Registered adapters. Empty until a real integration is added. */
export const channelAdapters: Partial<Record<ChannelId, ChannelAdapter>> = {};

/** Booking source label written to bookings.source for a channel. */
export const channelSource = (c: ChannelId) => c.replace("_com", ".com").replace("_", " ");
