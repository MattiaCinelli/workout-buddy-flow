import { useAutoSync } from '@/hooks/useAutoSync';

// Renders nothing — exists only so useAutoSync (which needs useData(), and
// so must live under DataProvider) runs for the app's whole lifetime,
// independent of which route is currently mounted.
const AutoSync = () => {
  useAutoSync();
  return null;
};

export default AutoSync;
