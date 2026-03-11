import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "@/lib/api";

export interface EnvVariable {
  name: string;
  isSecret: boolean;
}

interface EnvContextValue {
  environment: string | null;
  variables: string[];
  secrets: string[];
  variablesWithType: EnvVariable[];
  variableValues: Record<string, string>;
  secretValues: Record<string, string>;
  isLoading: boolean;
}

const EnvContext = createContext<EnvContextValue>({
  environment: null,
  variables: [],
  secrets: [],
  variablesWithType: [],
  variableValues: {},
  secretValues: {},
  isLoading: false,
});

export function EnvProvider({
  environment,
  refreshKey,
  children,
}: {
  environment: string | null;
  refreshKey?: number;
  children: ReactNode;
}) {
  const [variables, setVariables] = useState<string[]>([]);
  const [secrets, setSecrets] = useState<string[]>([]);
  const [variablesWithType, setVariablesWithType] = useState<EnvVariable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!environment) {
      setVariables([]);
      setSecrets([]);
      setVariablesWithType([]);
      setVariableValues({});
      setSecretValues({});
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
        const secretKeys = Object.keys(env.secrets);
        const varsWithType: EnvVariable[] = [
          ...Object.keys(env.variables).map((name) => ({ name, isSecret: false })),
          ...Object.keys(env.secrets).map((name) => ({ name, isSecret: true })),
        ];
        setVariables(vars);
        setSecrets(secretKeys);
        setVariablesWithType(varsWithType);
        setVariableValues(env.variables);
        setSecretValues(env.secrets);
      })
      .catch(() => {
        setVariables([]);
        setSecrets([]);
        setVariablesWithType([]);
        setVariableValues({});
        setSecretValues({});
      })
      .finally(() => setIsLoading(false));
  }, [environment, refreshKey]);

  return (
    <EnvContext.Provider value={{ environment, variables, secrets, variablesWithType, variableValues, secretValues, isLoading }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnvVariables() {
  return useContext(EnvContext);
}
