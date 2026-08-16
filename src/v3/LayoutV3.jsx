import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import LayoutV2 from '../v2/LayoutV2';
import HeaderV3 from './HeaderV3';
import FooterV3 from './FooterV3';
import MiniPlayerV3 from './MiniPlayerV3';

export default function LayoutV3({ admin = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAuth();
  const { currentTrack, currentTrackTitle } = useAudioPlayer();
  const playerOpen = Boolean(currentTrack && currentTrackTitle);

  if (admin || location.pathname.startsWith('/admin')) {
    return <LayoutV2 admin />;
  }

  if (location.pathname.startsWith('/admin') && !isAdminAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div className="v3-page">
      <HeaderV3 />
      <main className={`flex-1 ${playerOpen ? 'pb-28' : 'pb-8'}`}>
        <Outlet />
      </main>
      <FooterV3 />
      <MiniPlayerV3 />
    </div>
  );
}
