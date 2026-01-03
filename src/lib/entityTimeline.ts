// src/lib/entityTimeline.ts

export type EntityTimelineEvent = {
    id: string;
    entity_type: "device" | "user" | "ip";
    entity_id: string;
  
    case_id: string;
    timestamp: string;
  
    type: "case_opened" | "status_change" | "finding" | "note";
    message: string;
  
    risk_delta: number; // + / - impact to risk trajectory
  };
  
  const KEY = "soc:entity_timelines";
  
  export function getTimeline(): EntityTimelineEvent[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }
  
  export function saveTimeline(events: EntityTimelineEvent[]) {
    localStorage.setItem(KEY, JSON.stringify(events));
  }
  
  export function appendTimeline(event: EntityTimelineEvent) {
    const all = getTimeline();
    all.unshift(event);
    saveTimeline(all);
  }
  
  export function clearTimeline() {
    localStorage.removeItem(KEY);
  }
  