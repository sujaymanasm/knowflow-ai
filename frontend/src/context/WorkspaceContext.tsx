import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace } from '../types/api';
import { api } from '../lib/api';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
  isDemoMode: boolean;
  activeModelInfo: { embedding: string; llm: string };
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [activeModelInfo, setActiveModelInfo] = useState({
    embedding: 'local-dense-384',
    llm: 'gpt-4o-mini',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wsList, health] = await Promise.all([
        api.listWorkspaces(),
        api.getHealth().catch(() => null),
      ]);

      setWorkspaces(wsList);
      if (health) {
        setIsDemoMode(health.is_demo_mode);
        setActiveModelInfo({
          embedding: health.embedding_model,
          llm: health.llm_model,
        });
      }

      // If no workspace selected, select first
      if (wsList.length > 0) {
        setCurrentWorkspace((prev) => {
          if (prev && wsList.some((w) => w.id === prev.id)) {
            return wsList.find((w) => w.id === prev.id) || wsList[0];
          }
          return wsList[0];
        });
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        isLoading,
        refreshWorkspaces: loadData,
        isDemoMode,
        activeModelInfo,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
