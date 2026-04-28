export interface SessionUser {
  webId: string;
  name?: string;
}

export interface Card {
  url: string;
  label: string;
  fields: string[]; // List of predicate URIs
}

export interface Contact {
  webId: string;
  name?: string;
  homeCity?: string;
  currentCity?: string;
}
