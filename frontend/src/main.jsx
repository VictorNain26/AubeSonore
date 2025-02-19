import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css'
import App from './App.jsx'
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: 'https://ourmusic.fr/spotify-refresh',
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0Provider>
  </React.StrictMode>
);
