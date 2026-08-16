import React from 'react';
import HeaderV3 from './HeaderV3';
import FooterV3 from './FooterV3';

export default function AuthShellV3({ children }) {
  return (
    <div className="v3-page">
      <HeaderV3 />
      <main className="flex-1">{children}</main>
      <FooterV3 />
    </div>
  );
}
