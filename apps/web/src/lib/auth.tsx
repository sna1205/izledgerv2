import { createContext, useContext, useEffect, useMemo, useState } from "react";

const USERS_STORAGE_KEY = "izledger-auth-users";
const SESSION_STORAGE_KEY = "izledger-auth-session";

interface StoredUser {
  username: string;
  password: string;
}

interface AuthUser {
  username: string;
}

interface AuthContextValue {
  isReady: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => { error?: string };
  register: (username: string, password: string) => { error?: string };
  logout: () => void;
  changePassword: (currentPassword: string, nextPassword: string) => { error?: string };
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getStoredSession(): AuthUser | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed?.username ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

function normalizeUsername(username: string) {
  return username.trim();
}

function findUserByUsername(users: StoredUser[], username: string) {
  const normalized = normalizeUsername(username).toLowerCase();
  return users.find((user) => user.username.toLowerCase() === normalized);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredSession());
    setIsReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      user,
      login: (username, password) => {
        const normalizedUsername = normalizeUsername(username);
        const trimmedPassword = password.trim();

        if (!normalizedUsername) {
          return { error: "Username is required." };
        }

        if (!trimmedPassword) {
          return { error: "Password is required." };
        }

        const users = getStoredUsers();
        const existingUser = findUserByUsername(users, normalizedUsername);

        if (!existingUser || existingUser.password !== password) {
          return { error: "Invalid username or password." };
        }

        const nextUser = { username: existingUser.username };
        saveSession(nextUser);
        setUser(nextUser);
        return {};
      },
      register: (username, password) => {
        const normalizedUsername = normalizeUsername(username);
        const trimmedPassword = password.trim();

        if (!normalizedUsername) {
          return { error: "Username is required." };
        }

        if (!trimmedPassword) {
          return { error: "Password is required." };
        }

        const users = getStoredUsers();

        if (findUserByUsername(users, normalizedUsername)) {
          return { error: "Username already exists." };
        }

        const nextUser = {
          username: normalizedUsername,
          password,
        };

        saveStoredUsers([...users, nextUser]);
        saveSession({ username: nextUser.username });
        setUser({ username: nextUser.username });
        return {};
      },
      logout: () => {
        saveSession(null);
        setUser(null);
      },
      changePassword: (currentPassword, nextPassword) => {
        if (!user) {
          return { error: "You need to log in again." };
        }

        if (!currentPassword.trim()) {
          return { error: "Current password is required." };
        }

        if (!nextPassword.trim()) {
          return { error: "New password is required." };
        }

        const users = getStoredUsers();
        const existingUser = findUserByUsername(users, user.username);

        if (!existingUser || existingUser.password !== currentPassword) {
          return { error: "Current password is incorrect." };
        }

        saveStoredUsers(
          users.map((storedUser) =>
            storedUser.username.toLowerCase() === existingUser.username.toLowerCase()
              ? { ...storedUser, password: nextPassword }
              : storedUser,
          ),
        );

        return {};
      },
    }),
    [isReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
