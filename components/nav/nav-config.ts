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

/** Contact actions in the glass pill. */
export const NAV_LINKEDIN_URL = "https://www.linkedin.com/in/blake-schubert/";
export const NAV_EMAIL = "blakeschubertux@gmail.com";
export const NAV_EMAIL_HREF = `mailto:${NAV_EMAIL}`;
export const NAV_RESUME_HREF = "/Blake_Schubert_Product_Designer_Resume_2026.pdf";
/** Browser download filename (spaces OK in the download attribute). */
export const NAV_RESUME_DOWNLOAD = "Blake Schubert Product Designer Resume 2026.pdf";
