import { createContext, ReactElement, ReactNode, useContext } from 'react';

interface QueryEditorConfig {
  hiddenFields?: string[];
}

const QueryEditorConfigContext = createContext<QueryEditorConfig>({});

export function useQueryEditorConfig(): QueryEditorConfig {
  return useContext(QueryEditorConfigContext);
}

export function QueryEditorConfigProvider({
  children,
  hiddenFields,
}: {
  children: ReactNode;
  hiddenFields?: string[];
}): ReactElement {
  return (
    <QueryEditorConfigContext.Provider value={{ hiddenFields }}>
      {children}
    </QueryEditorConfigContext.Provider>
  );
}
