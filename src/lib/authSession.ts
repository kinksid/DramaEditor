export const SESSION_KEY = "dreem-studio-session";

export type LocalTeam = {
  id: string;
  name: string;
  createdAt: string;
};

export type LocalSession = {
  referralCode?: string;
  email?: string;
  signedInAt?: string;
  displayName?: string;
  bio?: string;
  coverImage?: string;
  following?: number;
  followers?: number;
  favorites?: number;
  featuredProjectIds?: string[];
  points?: number;
  teams?: LocalTeam[];
  socialLink?: string;
  profession?: string;
  country?: string;
  city?: string;
  showJoinDate?: boolean;
  planId?: "free" | "basic" | "pro" | "ultimate" | "max";
  teamId?: string;
  mode?: string;
};

export function readSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function profileIdFromSession(session: LocalSession | null): string {
  const seed = session?.email || session?.referralCode || "local-creator";
  return seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "local-creator";
}

function emit() {
  window.dispatchEvent(new Event("dramaeditor-session"));
}

export function writeSession(partial: Partial<LocalSession>) {
  const prev = readSession();
  const email = partial.email?.trim() || prev?.email;
  const displayName =
    partial.displayName?.trim() ||
    prev?.displayName ||
    (email ? email.split("@")[0] : undefined) ||
    "New Tapper";
  const session: LocalSession = {
    referralCode: partial.referralCode || prev?.referralCode || `LOCAL-${Date.now().toString(36).slice(-6)}`,
    email: email || undefined,
    displayName,
    bio: partial.bio ?? prev?.bio ?? "",
    coverImage: partial.coverImage ?? prev?.coverImage,
    following: partial.following ?? prev?.following ?? 0,
    followers: partial.followers ?? prev?.followers ?? 0,
    favorites: partial.favorites ?? prev?.favorites ?? 0,
    featuredProjectIds: partial.featuredProjectIds ?? prev?.featuredProjectIds ?? [],
    points: partial.points ?? prev?.points ?? 0,
    teams: partial.teams ?? prev?.teams ?? [],
    socialLink: partial.socialLink ?? prev?.socialLink ?? "",
    profession: partial.profession ?? prev?.profession ?? "",
    country: partial.country ?? prev?.country ?? "",
    city: partial.city ?? prev?.city ?? "",
    showJoinDate: partial.showJoinDate ?? prev?.showJoinDate ?? true,
    planId: partial.planId ?? prev?.planId ?? "free",
    teamId: partial.teamId ?? prev?.teamId ?? `C${Date.now().toString().slice(-12)}Hbzcwn`,
    signedInAt: prev?.signedInAt || new Date().toISOString(),
    mode: "local-shell",
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
  return session;
}

export function updateSession(patch: Partial<LocalSession>) {
  const prev = readSession();
  if (!prev) return writeSession(patch);
  const next: LocalSession = {
    ...prev,
    ...patch,
    email: patch.email !== undefined ? patch.email.trim() || undefined : prev.email,
    displayName:
      patch.displayName !== undefined
        ? patch.displayName.trim().slice(0, 30) || prev.displayName || "New Tapper"
        : prev.displayName,
    bio: patch.bio !== undefined ? patch.bio.slice(0, 200) : prev.bio,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  emit();
  return next;
}

export function addTeam(name: string) {
  const prev = readSession();
  if (!prev) return null;
  const trimmed = name.trim().slice(0, 50);
  if (!trimmed) return prev;
  const team: LocalTeam = {
    id: `team-${Date.now().toString(36)}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  return updateSession({ teams: [...(prev.teams ?? []), team] });
}

export function addPoints(amount: number) {
  const prev = readSession();
  if (!prev) return null;
  return updateSession({ points: (prev.points ?? 0) + amount });
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  emit();
}
