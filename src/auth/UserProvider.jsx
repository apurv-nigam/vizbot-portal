import { createContext, useContext, useState, useCallback } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [vizUser, setVizUser] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);

  const setUser = useCallback((data) => {
    setVizUser({
      user_id: data.user_id,
      name: data.name,
      org_id: data.org_id,
      org_name: data.org_name,
      role: data.role,
      is_new: data.is_new,
    });
    if (data.pending_invitations) {
      setPendingInvitations(data.pending_invitations);
    }
  }, []);

  return (
    <UserContext.Provider value={{ vizUser, pendingInvitations, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
