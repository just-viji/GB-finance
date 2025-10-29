import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopNavigationBar from './DesktopNavigationBar';
import MobileBottomNavigationBar from './MobileBottomNavigationBar';

const NavigationBar = () => {
  const isMobile = useIsMobile();

  return (
    <>
      <DesktopNavigationBar />
      {isMobile && <MobileBottomNavigationBar />}
    </>
  );
};

export default NavigationBar;