export const NAV_BRAND = "Blake Schubert";

/** Live site destinations (Framer page section ids from blakeschubert.com). */
export const NAV_HOME_URL = "https://blakeschubert.com/";

export const NAV_LINKS = [
  { href: "https://blakeschubert.com/about", label: "About" },
  /** Selected Work section — first project anchor on the home page. */
  { href: "https://blakeschubert.com/#all-campus", label: "Work" },
  { href: "https://blakeschubert.com/#why-im-looking", label: "Why I'm looking" },
] as const;

/** Nav logo — pixel avatar in the far-left mark. */
export const NAV_AVATAR_SRC = "/avatar.png";

/** Placeholder contact actions — swap in Framer / later config. */
export const NAV_LINKEDIN_URL = "https://www.linkedin.com/in/blake-schubert/";
export const NAV_EMAIL = "hello@blakeschubert.com";
export const NAV_RESUME_HREF = "/resume.pdf";
