// src/lib/services/api.ts

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
}

export interface TripDay {
  id: string;
  tripId: string;
  date: string;
}

export interface Event {
  id: string;
  dayId: string;
  title: string;
  time?: string;
  description?: string;
}

export interface Location {
  id: string;
  dayId: string;
  name: string;
  address: string;
}

export interface Attachment {
  id: string;
  dayId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
}

export const api = {
  getTrips: async (): Promise<Trip[]> => {
    const res = await fetch('/api/trips');
    return res.json();
  },
  
  getTrip: async (id: string): Promise<Trip | undefined> => {
    const res = await fetch(`/api/trips/${id}`);
    if (!res.ok) return undefined;
    return res.json();
  },

  createTrip: async (trip: Omit<Trip, 'id'>): Promise<Trip> => {
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip)
    });
    return res.json();
  },

  getEvents: async (dayId: string): Promise<Event[]> => {
    const res = await fetch(`/api/events?dayId=${dayId}`);
    const data = await res.json();
    return data.map((e: any) => ({ ...e, dayId }));
  },

  createEvent: async (event: Omit<Event, 'id'>): Promise<Event> => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return res.json();
  },

  getLocations: async (dayId: string): Promise<Location[]> => {
    const res = await fetch(`/api/locations?dayId=${dayId}`);
    const data = await res.json();
    return data.map((l: any) => ({ ...l, dayId }));
  },

  createLocation: async (location: Omit<Location, 'id'>): Promise<Location> => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location)
    });
    return res.json();
  },

  getAttachments: async (dayId: string): Promise<Attachment[]> => {
    const res = await fetch(`/api/attachments?dayId=${dayId}`);
    const data = await res.json();
    return data.map((a: any) => ({ ...a, dayId }));
  },

  createAttachment: async (attachment: Omit<Attachment, 'id' | 'fileUrl'>, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dayId', attachment.dayId);
    formData.append('fileName', attachment.fileName);
    formData.append('mimeType', attachment.mimeType);

    const res = await fetch('/api/attachments', {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  deleteAttachment: async (id: string): Promise<void> => {
    const res = await fetch(`/api/attachments/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Failed to delete attachment');
    }
  },

  deleteTrip: async (id: string): Promise<void> => {
    const res = await fetch(`/api/trips/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Failed to delete trip');
    }
  }
};
