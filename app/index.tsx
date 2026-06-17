import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function IndexScreen() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (session) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/(auth)/login" />;
}
