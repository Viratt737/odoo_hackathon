import { useAuth } from '../context/AuthContext';

/**
 * Convenience hook to access the auth context.
 * Re-exported here so components can use the hook directly
 * without importing from the context directory.
 */
export { useAuth };
export default useAuth;
