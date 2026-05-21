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
  location?: Omit<Location, 'id' | 'eventId'>;
  attachments?: Attachment[];
}

export interface Location {
  id: string;
  eventId: string;
  name: string;
  address: string;
}

export interface Attachment {
  id: string;
  eventId: string;
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
    return res.json();
  },

  createEvent: async (event: Omit<Event, 'id' | 'attachments'>, files?: File[]): Promise<Event> => {
    const formData = new FormData();
    formData.append('dayId', event.dayId);
    formData.append('title', event.title);
    if (event.time) formData.append('time', event.time);
    if (event.description) formData.append('description', event.description);
    if (event.location) {
      formData.append('location', JSON.stringify(event.location));
    }
    
    if (files) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  getAttachments: async (eventId: string): Promise<Attachment[]> => {
    const res = await fetch(`/api/attachments?eventId=${eventId}`);
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
