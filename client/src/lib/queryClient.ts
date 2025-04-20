import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First try to parse as JSON for structured error messages
      const errorData = await res.json();
      console.error('API Error Response:', errorData);
      
      if (errorData.message) {
        throw new Error(errorData.message);
      } else {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      // If parsing JSON fails, use text or status
      if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
        throw e; // Rethrow if it's a custom error we created above
      }
      
      // Otherwise, get the response text
      const text = await res.text() || res.statusText;
      console.error('API Error Response (text):', text);
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  urlOrOptions: string | (RequestInit & { url?: string }),
  options?: RequestInit,
): Promise<any> {
  let url: string;
  let fetchOptions: RequestInit;

  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
    fetchOptions = options || {};
  } else {
    // Extract url from the options and remove it from fetchOptions
    const { url: optionsUrl, ...restOptions } = urlOrOptions;
    url = optionsUrl || '';
    fetchOptions = restOptions;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
    },
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Try to parse as JSON, fallback to text if it fails
  try {
    const data = await res.json();
    return data;
  } catch (e) {
    // If the response is not JSON, just return the raw response
    return res;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  path?: string;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, path }) =>
  async ({ queryKey }) => {
    // Use provided path or first query key as URL
    const url = path || queryKey[0] as string;
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
