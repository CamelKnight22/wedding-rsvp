// Database types

export interface WeddingSettings {
  id: string;
  couple_names: string;
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  venue_address?: string;
  invitation_image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  plus_ones_allowed: number;
  passcode: string;
  notes?: string;
  group_name?: string;
  qr_code?: string;
  invitation_sent_at?: string;
  qr_sent_at?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  // Joined data
  plus_ones?: PlusOne[];
  rsvp?: RSVP;
  table_assignment?: TableAssignment & { table?: Table };
}

export interface PlusOne {
  id: string;
  guest_id: string;
  name: string;
  created_at: string;
}

export type RSVPStatus = "pending" | "attending" | "not_attending";

export interface RSVP {
  id: string;
  guest_id: string;
  status: RSVPStatus;
  number_attending: number;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FloorPlan {
  id: string;
  width: number;
  height: number;
  background_image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  // Joined data
  tables?: Table[];
}

export type TableShape = "round" | "rectangular" | "square";

export interface Table {
  id: string;
  floor_plan_id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  created_at: string;
  updated_at: string;
  // Joined data
  assignments?: TableAssignment[];
}

export interface TableAssignment {
  id: string;
  guest_id: string;
  table_id: string;
  seat_number?: number;
  created_at: string;
  // Joined data
  guest?: Guest;
  table?: Table;
}

export type MessageType = "invitation" | "qr_code" | "reminder";
export type MessageStatus = "pending" | "sent" | "delivered" | "failed";

export interface MessageLog {
  id: string;
  guest_id: string;
  message_type: MessageType;
  status: MessageStatus;
  provider_message_id?: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

// Form types

export interface GuestFormData {
  first_name: string;
  last_name?: string;
  phone: string;
  passcode: string;
  plus_ones_allowed: number;
  notes?: string;
  group_name?: string;
  plus_ones: { name: string }[];
}

export interface WeddingSettingsFormData {
  couple_names: string;
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  venue_address?: string;
}

// API response types

export interface RSVPValidationResponse {
  id: string;
  first_name: string;
  last_name?: string;
  plus_ones_allowed: number;
  plus_ones: { id: string; name: string }[];
  current_rsvp?: {
    status: RSVPStatus;
    number_attending: number;
  };
}

export interface QRGuestInfo {
  guest: {
    first_name: string;
    last_name?: string;
  };
  plus_ones: { name: string }[];
  table?: {
    name: string;
  };
}
