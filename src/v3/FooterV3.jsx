import React from 'react';
import { Link } from 'react-router-dom';

export default function FooterV3() {
  return (
    <footer className="v3-footer">
      <div className="v3-shell v3-footer-row">
        <span>© {new Date().getFullYear()} XWinner</span>
        <div className="v3-footer-links">
          <Link to="/terms">Соглашение</Link>
          <Link to="/privacy">Приватность</Link>
          <Link to="/consent-personal-data">ПДн</Link>
          <Link to="/cookies">Cookie</Link>
        </div>
      </div>
    </footer>
  );
}
