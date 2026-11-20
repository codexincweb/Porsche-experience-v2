// Build-time environment helpers shared across the app.
const meta = import.meta.env ?? {};
export const BASE_URL = meta.BASE_URL ?? "/";
export const IS_DEV = Boolean(meta.DEV);
