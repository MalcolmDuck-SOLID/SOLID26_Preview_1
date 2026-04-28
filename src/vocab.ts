import { FOAF, VCARD, SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";

export const CM = "https://callme.app/ns#";

export const VOCAB = {
  CM: {
    Card: `${CM}Card`,
    Share: `${CM}Share`,
    label: `${CM}label`,
    hasField: `${CM}hasField`,
    sharedCard: `${CM}sharedCard`,
    shareTarget: `${CM}shareTarget`,
    sharedAt: `${CM}sharedAt`,
    currentCity: `${CM}currentCity`,
    homeCity: `${CM}homeCity`,
  },
  FOAF: {
    name: FOAF.name,
    age: FOAF.age,
    knows: FOAF.knows,
    homepage: FOAF.homepage,
    Person: FOAF.Person,
  },
  VCARD: {
    note: VCARD.note,
    Group: VCARD.Group,
    hasMember: VCARD.hasMember,
  },
  SCHEMA: {
    homeLocation: "https://schema.org/homeLocation",
    additionalName: "https://schema.org/additionalName",
  },
  SOLID: {
    privateTypeIndex: "http://www.w3.org/ns/solid/terms#privateTypeIndex",
    publicTypeIndex: "http://www.w3.org/ns/solid/terms#publicTypeIndex",
    TypeRegistration: "http://www.w3.org/ns/solid/terms#TypeRegistration",
    forClass: "http://www.w3.org/ns/solid/terms#forClass",
    instanceContainer: "http://www.w3.org/ns/solid/terms#instanceContainer",
  },
  ACL: {
    Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
    agent: "http://www.w3.org/ns/auth/acl#agent",
    accessTo: "http://www.w3.org/ns/auth/acl#accessTo",
    mode: "http://www.w3.org/ns/auth/acl#mode",
    Read: "http://www.w3.org/ns/auth/acl#Read",
    Write: "http://www.w3.org/ns/auth/acl#Write",
    Control: "http://www.w3.org/ns/auth/acl#Control",
  }
};
