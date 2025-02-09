import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Outlet } from 'react-router';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return <div>Chargement...</div>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
