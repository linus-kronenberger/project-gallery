import React from 'react';
import Link from 'next/link'

const HomeNavbar = () => {
  return (
    <nav>
        <Link href="/">About</Link>
        <Link href="/">Home</Link>
    </nav>
  );
}

export default HomeNavbar;
