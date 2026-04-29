export interface SessionUser {
  webId: string;
  name?: string;
}

export interface Card {
  url: string;
  label: string;
  fields: string[]; // List of predicate URIs
  background?: string;
  message?: string;
}

export interface Contact {
  url: string;          // URL of the person document in /contacts/
  webId: string;        // Their WebID
  name?: string;        // foaf:name
  nick?: string;        // foaf:nick
  mbox?: string;        // foaf:mbox
  homepage?: string;    // foaf:homepage
  img?: string;         // foaf:img
}
