import {useEffect, useCallback} from 'react';

export function useFocusEffect(callback: () => (() => void) | void) {
  // On web there's no screen focus lifecycle — just run on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return callback() ?? undefined;
  }, []);
}

export function useNavigation() {
  throw new Error('useNavigation not supported on web — pass navigation as a prop');
}

export function useRoute() {
  throw new Error('useRoute not supported on web — pass route as a prop');
}

export const NavigationContainer = ({children}: {children: any}) => children;
