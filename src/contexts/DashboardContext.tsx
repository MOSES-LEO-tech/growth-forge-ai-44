import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface DashboardContextType {
  achievementModalOpen: boolean;
  openAchievementModal: () => void;
  closeAchievementModal: () => void;
  projectModalOpen: boolean;
  openProjectModal: () => void;
  closeProjectModal: () => void;
  eventModalOpen: boolean;
  openEventModal: () => void;
  closeEventModal: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [achievementModalOpen, setAchievementModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const openAchievementModal = useCallback(() => setAchievementModalOpen(true), []);
  const closeAchievementModal = useCallback(() => setAchievementModalOpen(false), []);
  const openProjectModal = useCallback(() => setProjectModalOpen(true), []);
  const closeProjectModal = useCallback(() => setProjectModalOpen(false), []);
  const openEventModal = useCallback(() => setEventModalOpen(true), []);
  const closeEventModal = useCallback(() => setEventModalOpen(false), []);

  return (
    <DashboardContext.Provider value={{
      achievementModalOpen, openAchievementModal, closeAchievementModal,
      projectModalOpen, openProjectModal, closeProjectModal,
      eventModalOpen, openEventModal, closeEventModal,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
