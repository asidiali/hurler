import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "@/lib/api";

interface EnvContextValue {
  environment: string | null;
  variables: string[];
  isLoading: boolean;
}

const EnvContext = createContext<EnvContextValue>({
  environment: null,
  variables: [],
  isLoading: false,
});

export function EnvProvider({
  environment,
  children,
}: {
  environment: string | null;
  children: ReactNode;
}) {
  const [variables, setVariables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!environment) {
      setVariables([]);
      return;
    }

    setIsLoading(true);
    api
      .readEnvironment(environment)
      .then((env) => {
        const vars = [
          ...Object.keys(env.variables),
          ...Object.keys(env.secrets),
        ];
        setVariables(vars);
      })
      .catch(() => setVariables([]))
      .finally(() => setIsLoading(false));
  }, [environment]);

  return (
    <EnvContext.Provider value={{ environment, variables, isLoading }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnvVariables() {
  return useContext(EnvContext);
}
