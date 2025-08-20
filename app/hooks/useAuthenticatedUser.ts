import { useEffect, useState } from "react";

export function useAuthenticatedUser() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const getUser = () => {
      const match = document.cookie.match(/(?:^|;\s*)authenticated_user=([^;]*)/);
      setUserName(match ? decodeURIComponent(match[1]) : null);
    };
    getUser();

    window.addEventListener("user-logout", getUser);
    window.addEventListener("user-login", getUser);

    return () => {
      window.removeEventListener("user-logout", getUser);
      window.removeEventListener("user-login", getUser);
    };
  }, []);

  return userName;
}