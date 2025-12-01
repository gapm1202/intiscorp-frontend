import { useAuth as useAuthContext } from "@/context/authHelpers";

// Re-export the named hook as default for compatibility with existing imports
export default useAuthContext;
export { useAuthContext as useAuth };
