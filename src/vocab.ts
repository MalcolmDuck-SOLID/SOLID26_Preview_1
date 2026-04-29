import { FOAF, VCARD } from "@inrupt/vocab-common-rdf";

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
    hasBackground: `${CM}hasBackground`,
    message: `${CM}message`,
    currentCity: `${CM}currentCity`,
    homeCity: `${CM}homeCity`,
    backgroundData: `${CM}backgroundData`,
    photoData: `${CM}photoData`,
    profileData: `${CM}profileData`,
    fieldLabel: `${CM}fieldLabel`,
    fieldValue: `${CM}fieldValue`,
  },
  FOAF: {
    name: FOAF.name,
    age: FOAF.age,
    knows: FOAF.knows,
    homepage: FOAF.homepage,
    Person: FOAF.Person,
    nick: FOAF.nick,
    Group: "http://xmlns.com/foaf/0.1/Group",
    member: "http://xmlns.com/foaf/0.1/member",
    mbox: "http://xmlns.com/foaf/0.1/mbox",
    img: "http://xmlns.com/foaf/0.1/img",
  },
  VCARD: {
    note: VCARD.note,
    Group: VCARD.Group,
    hasMember: VCARD.hasMember,
    fn: VCARD.fn,
    bday: VCARD.bday,
    role: VCARD.role,
    hasPhoto: VCARD.hasPhoto,
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
