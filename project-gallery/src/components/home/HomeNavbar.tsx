import React from 'react';
import Link from 'next/link'

const HomeNavbar = () => {
  return (
    <nav>
        <Link href="/">Projects</Link>
        <Link href="/about">About Me</Link>
    </nav>
  );
}

export default HomeNavbar;
